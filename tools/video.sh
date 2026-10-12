#!/bin/zsh
# Prépare un extrait vidéo pour le mur LED et les tablettes : muet, H.264 1920 px, démarrage instantané,
# couleurs BT.709 déclarées, plus une image d'affiche. Une vidéo verticale est posée sur un fond flouté
# d'elle-même pour remplir le cadre 16:9 sans être recadrée.
# Usage : tools/video.sh <source> <nom> <début hh:mm:ss> <fin hh:mm:ss>
set -euo pipefail
src=$1 name=$2 ss=$3 to=$4
out="$(cd "$(dirname "$0")/.." && pwd)/public/assets/videos"
mkdir -p "$out"

IFS=x read w h <<<"$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$src")"
if (( h > w )); then
  vf="[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=28:2,eq=brightness=-0.18:saturation=1.1[bg];[0:v]scale=-2:1080[fg];[bg][fg]overlay=(W-w)/2:0,fps=30,format=yuv420p"
else
  vf="[0:v]scale=1920:-2:flags=lanczos,fps=30,format=yuv420p"
fi

ffmpeg -v error -y -ss "$ss" -to "$to" -i "$src" -filter_complex "$vf" -an \
  -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -movflags +faststart "$out/$name.mp4"

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/$name.mp4")
ffmpeg -v error -y -ss "$(python3 -c "print($dur/2)")" -i "$out/$name.mp4" -frames:v 1 -vf "scale=1600:-2" -q:v 3 "$out/$name.jpg"
IFS=x read ow oh <<<"$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$out/$name.mp4")"
echo "$name ${ow}x${oh} ${dur%.*}s $(du -h "$out/$name.mp4" | cut -f1)"
