#!/usr/bin/env bash
# bin/detect <build-dir>
set -e

build=$(cd "$1/" && pwd)

echo $(cd && pwd)
echo $build

if test -f "${build}/Gopkg.lock" || #dep
   test -f "${build}/Godeps/Godeps.json" || # godeps
   test -f "${build}/vendor/vendor.json" || # govendor
   test -f "${build}/glide.yaml" || # glide
   (test -d "${build}/src" && test -n "$(find "${build}/src" -mindepth 2 -type f -name '*.go' | sed 1q)") # gb
then
  echo Go
else
  exit 1
fi