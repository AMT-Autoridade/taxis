#!/bin/bash

# This script downloads prepares Portuguese boundary data.
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
BASE_NAME='caop_concelhos'
EXP_DIR="./export"

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

echo "Unpacking the source data..."
for RAR in "$SRC_DIR"/*
do
  $cmd_unrar e $RAR $TMP_DIR &>/dev/null
done

echo "Merging the different shapefiles into one..."
cd $TMP_DIR
for SHP in ./*.shp
do
  if [ -f ./merged.shp ]
    then
      $cmd_ogr2ogr -update -append merged.shp $SHP -nln merged -t_srs EPSG:4326
  else 
    $cmd_ogr2ogr merged.shp $SHP -t_srs EPSG:4326
  fi
done

echo "Dissolving polygons from same concelho..."
# Dissolve all polygons
# ST_buffer is necessary to fix issues with self-intersecting polygons in the
# source data
$cmd_ogr2ogr \
  ./$BASE_NAME.shp \
  ./merged.shp \
  -dialect sqlite \
  -sql "SELECT ST_union(ST_BUFFER(geometry, 0)),Dicofre FROM merged GROUP BY substr(Dicofre,1,4)"

echo "Add indication of Dico..."
$cmd_ogrinfo \
  ./$BASE_NAME.shp \
  -sql "ALTER TABLE $BASE_NAME RENAME COLUMN Dicofre TO Dico"

# Dico consists of the first 4 digits of the Dicofre
$cmd_ogrinfo \
  ./$BASE_NAME.shp \
  -dialect sqlite \
  -sql "UPDATE $BASE_NAME SET Dico = substr(Dico,1,4)"

cd ..
mv $TMP_DIR/$BASE_NAME* $EXP_DIR
cd $EXP_DIR

echo "Convert to GeoJSON..."
$cmd_ogr2ogr \
  -f "GeoJSON" \
  ./$BASE_NAME.geojson \
  ./$BASE_NAME.shp \

echo "Convert to TopoJSON..."
$cmd_geo2topo ./$BASE_NAME.geojson > ./$BASE_NAME.topojson

echo "Generate a simplified TopoJSON..."
$cmd_toposimplify -P 0.05 ./$BASE_NAME.topojson > ./$BASE_NAME-P0_05.topojson

cd ..
rm -r $TMP_DIR