#!/usr/bin/env bash
# FTP ile yayınlama (test ortamı). Sır İÇERMEZ: ayarlar repo kökündeki .deploy.env dosyasından okunur
# (git dışında, chmod 600):  FTP_HOST FTP_PORT FTP_USER FTP_PASS SITE_URL  [FTP_TLS=1] [FTP_CONNECT_IP]
#
#   tools/deploy-ftp.sh                  kuru çalıştırma: yüklenecek dosyaları listeler (ağ yok)
#   tools/deploy-ftp.sh --list-remote    sunucu ana klasörünü okur (yalnızca okuma)
#   tools/deploy-ftp.sh --upload         YALNIZCA sunucu klasörü tamamen BOŞSA yükler
#
# GÜVENLİK KURALLARI (kullanıcı kararı; sunucuda başka bir site olabilir):
#   1. Sunucudan hiçbir dosya/klasör SİLİNMEZ (betikte silme komutu yoktur).
#   2. Klasör boş değilse (gizli dosyalar dahil herhangi bir girdi varsa) HİÇBİR ŞEY yüklenmez, üzerine yazılmaz; çıkış 3.
#   3. Listeleme başarısızsa (bağlantı/yetki/TLS hatası) "boş" varsayılmaz; yükleme yapılmaz; çıkış 4.
# Yüklenen: kökteki *.html *.css *.js, assets/, fonts/, favicon.ico, robots.txt. YüklenMEYEN: partials/, build.sh, tests/, tools/,
# .plan/, CLAUDE.md, .deploy.env, CNAME. TLS varsayılan zorunlu (FTP_TLS=0 ile kapatılır).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -f .deploy.env ] || { echo ".deploy.env yok" >&2; exit 2; }
# shellcheck disable=SC1091
. ./.deploy.env
: "${FTP_HOST:?}" "${FTP_USER:?}" "${FTP_PASS:?}"; FTP_PORT="${FTP_PORT:-21}"; FTP_TLS="${FTP_TLS:-1}"

files() { { ls -1 ./*.html ./*.css ./*.js 2>/dev/null | sed 's#^\./##'; find assets fonts -type f 2>/dev/null; [ -f favicon.ico ] && echo favicon.ico; [ -f robots.txt ] && echo robots.txt; } | sort; }

NETRC=$(mktemp); trap 'rm -f "$NETRC"' EXIT; chmod 600 "$NETRC"
printf 'machine %s login %s password %s\n' "$FTP_HOST" "$FTP_USER" "$FTP_PASS" > "$NETRC"   # parola komut satırında görünmez
TLS=(); [ "$FTP_TLS" = 1 ] && TLS=(--ssl-reqd)
# FTP_CONNECT_IP: TLS sertifikasındaki ad (ör. Hostinger: *.hstgr.io) sunucu adıyla eşleşmiyorsa, doğrulamayı KAPATMADAN,
# sertifikanın kapsadığı bir adı FTP_HOST yapıp bağlantıyı bu IP'ye yönlendirir (curl --resolve). Zincir ve ad yine doğrulanır.
RESOLVE=(); [ -n "${FTP_CONNECT_IP:-}" ] && RESOLVE=(--resolve "$FTP_HOST:$FTP_PORT:$FTP_CONNECT_IP")
cu() { curl -sS --connect-timeout 20 --ftp-skip-pasv-ip --netrc-file "$NETRC" "${TLS[@]}" "${RESOLVE[@]}" "$@"; }
url() { printf 'ftp://%s:%s/%s' "$FTP_HOST" "$FTP_PORT" "$1"; }

# Sunucu kökündeki tüm girdiler (gizli dahil; . ve .. hariç). Herhangi bir komut başarısızsa 1 döner: "boş" ASLA varsayılmaz.
remote_entries() {
  local names longl
  names=$(cu --list-only "$(url '')") || return 1
  longl=$(cu -X 'LIST -a' "$(url '')") || return 1
  { printf '%s\n' "$names"; printf '%s\n' "$longl" | grep -v '^total' | awk 'NF{print $NF}'; } \
    | tr -d '\r' | grep -vxE '\.|\.\.|' | sort -u || true
}

main() {
  local mode="${1:-dry}" entries n b f s
  case "$mode" in
    dry|--dry-run)
      n=0; b=0; while read -r f; do s=$(stat -c%s "$f"); b=$((b+s)); n=$((n+1)); done < <(files)
      files; echo; echo "$n dosya, $(( b/1024 )) KB (ağ kullanılmadı)";;
    --list-remote)
      entries=$(remote_entries) || { echo "sunucu listelenemedi (bağlantı/yetki/TLS)" >&2; exit 4; }
      if [ -z "$entries" ]; then echo "sunucu klasörü BOŞ"; else echo "sunucu klasörü BOŞ DEĞİL:"; printf '%s\n' "$entries" | sed 's/^/  /'; fi;;
    --upload)
      entries=$(remote_entries) || { echo "sunucu listelenemedi: yükleme YAPILMADI (boş olduğu doğrulanamadı)" >&2; exit 4; }
      if [ -n "$entries" ]; then
        echo "sunucu klasörü BOŞ DEĞİL; hiçbir şey yüklenmedi, hiçbir şey değiştirilmedi:" >&2; printf '%s\n' "$entries" | sed 's/^/  /' >&2; exit 3
      fi
      n=0; while read -r f; do cu --ftp-create-dirs -T "$f" "$(url "$f")"; n=$((n+1)); done < <(files)
      echo "$n dosya yüklendi → ${SITE_URL:-$FTP_HOST}";;
    *) echo "kullanım: $0 [--list-remote|--upload]" >&2; exit 2;;
  esac
}
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then main "$@"; fi
