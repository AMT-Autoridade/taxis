#!/bin/bash

# This script ingests a series of shapefiles with polygons for Portuguese
# freguesias (parishes) from CAOP (DGT).
# It produces a single simplified TopoJSON that contains polygons for all
# concelhos, distritos, nut1, nut2 and nut3.
#
# The source data can be downloaded in .rar format from http://www.dgterritorio.pt/cartografia_e_geodesia/cartografia/carta_administrativa_oficial_de_portugal__caop_/caop__download_/
# and should be placed (uncompressed) in the source folder.
#
# Requires
# - ogr
# - unrar
# - topojson ($ npm install topojson -g)
# - toposimplify ($ npm install topojson-simplify -g)
#
# Usage:
#   $ bash prep-boundaries.sh

SRC_DIR="./src"
TMP_DIR='./tmp'
EXP_DIR="./export"
BASE_NAME='pt-areas'


###############################################################################
# Doing some housekeeping and basic checks

error()
{
  echo >&2 $*
  exit 1
}

# for portability and just in case which is not available
typeset -r cmd_which="/usr/bin/which"
[[ -x $cmd_which ]] || error "$cmd_which command not found"

# check that every command is available and executable
# this is where a $cmd_foo var will be created for each command
# tar would be called with $cmd_tar
for command in ogr2ogr ogrinfo unrar geo2topo toposimplify
do
  typeset -r cmd_$command=$($cmd_which $command)
  [[ -x $(eval echo \$cmd_$command) ]] || error "$cmd_$command command not found"
done

[[ -d $SRC_DIR ]] || error "Create a directory $SRC_DIR and place the CAOP .rar files from http://www.dgterritorio.pt in it"

# Perform checks on the destination folder
[[ ! -d $EXP_DIR ]] || error "You already have a $EXP_DIR folder. Remove it and run this script again."
mkdir -p $EXP_DIR

mkdir $TMP_DIR


###############################################################################
# Unpack and organize

echo "Unpacking the source data..."
for RAR in "$SRC_DIR"/*
do
  $cmd_unrar e $RAR $TMP_DIR &>/dev/null
done

echo "Merging the different shapefiles into one..."
cd $TMP_DIR
for SHP in ./*.shp
do
  if [ -f ./raw_merged.shp ]
    then
      $cmd_ogr2ogr -update -append raw_merged.shp $SHP -nln raw_merged -t_srs EPSG:4326
  else 
    $cmd_ogr2ogr raw_merged.shp $SHP -t_srs EPSG:4326
  fi
done


###############################################################################
# Create the base file with concelhos

echo "Dissolving freguesias into concelho..."
# Dissolve all polygons
# ST_buffer is necessary to fix issues with self-intersecting polygons in the
# source data
$cmd_ogr2ogr \
  ./concelhos.shp \
  ./raw_merged.shp \
  -dialect sqlite \
  -sql "SELECT ST_union(ST_BUFFER(geometry, 0)), Dicofre \
        FROM raw_merged \
        GROUP BY substr(Dicofre,1,4)"

echo "Add indication of Dico..."

# Dico consists of the first 4 digits of the Dicofre
$cmd_ogrinfo -q \
  ./concelhos.shp \
  -dialect sqlite \
  -sql "UPDATE concelhos SET Dicofre = CAST(SUBSTR(Dicofre,1,4) AS INTEGER)"

echo "Joining concelho meta-data..."
# Join metadata from a CSV file with concelho meta-data
$cmd_ogr2ogr \
  -sql "SELECT  csv.concelho as concelho, \
                csv.distrito as distrito, \
                csv.nut1 as nut1, \
                csv.nut2 as nut2, \
                csv.nut3 as nut3
        FROM concelhos shp \
        LEFT JOIN '../../concelhos.csv'.concelhos csv \
        ON shp.Dicofre = csv.concelho" \
  ./concelhos_augmented.shp \
  ./concelhos.shp

# Add empty placeholder columns. Need two separate statements as ogr doesn't
# support multiple ADD COLUMN in the same
$cmd_ogrinfo -q \
  ./concelhos_augmented.shp \
  -sql "ALTER TABLE concelhos_augmented \
        ADD COLUMN type CHARACTER(10)"
$cmd_ogrinfo -q \
  ./concelhos_augmented.shp \
  -sql "ALTER TABLE concelhos_augmented \
        ADD COLUMN id CHARACTER(4)"


###############################################################################
# Use the base file with concelhos to generate a shapefile that contains
# polygons for all administrative areas of all types.

echo "Creating a shapefile with polygons for all areas of all types..."
# Add a layer for all the other types
for AREA in concelho distrito nut1 nut2 nut3
do
  $cmd_ogr2ogr \
    ./tmp_$AREA.shp \
    ./concelhos_augmented.shp

  $cmd_ogrinfo -q \
    -dialect sqlite \
    -sql "UPDATE tmp_$AREA \
          SET type = '$AREA', \
              id = $AREA" \
    ./tmp_$AREA.shp

  if [ -f ./all_areas.shp ]
    then
      $cmd_ogr2ogr \
        -update -append \
        all_areas.shp \
        ./tmp_$AREA.shp \
        -nln all_areas \
        -dialect sqlite \
        -sql "SELECT ST_union(ST_BUFFER(geometry, 0)),id,type \
              FROM tmp_$AREA \
              GROUP BY id"
  else
    $cmd_ogr2ogr \
      ./all_areas.shp \
      ./tmp_$AREA.shp \
      -dialect sqlite \
      -sql "SELECT ST_union(ST_BUFFER(geometry, 0)),id,type \
            FROM tmp_$AREA \
            GROUP BY id"
  fi
done

echo "Converting to GeoJSON..."
# Export to GeoJSON
$cmd_ogr2ogr \
  -f "GeoJSON" \
  ./$BASE_NAME.geojson \
  ./all_areas.shp

cd ..


###############################################################################
# Generate the TopoJSON exports

echo "Converting to TopoJSON..."
$cmd_geo2topo $TMP_DIR/$BASE_NAME.geojson > $TMP_DIR/$BASE_NAME.topojson

echo "Generating the final simplified TopoJSON..."
$cmd_toposimplify -P 0.02 -f $TMP_DIR/$BASE_NAME.topojson > $EXP_DIR/$BASE_NAME-P0_02.topojson

echo "Done. Enjoy!"
rm -r $TMP_DIR