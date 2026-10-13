// Imagens enviadas pelo usuário ficam embutidas no HTML como data URL.
// Antes de mandar o HTML para a IA trocamos cada data URL por um marcador
// curto (economiza muitos tokens) e depois devolvemos as imagens no lugar.

const DATA_URL_RE = /data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;
const PLACEHOLDER_RE = /hf-asset:\/\/(\d+)/g;

export function extractAssets(html: string): { html: string; assets: string[] } {
  const assets: string[] = [];
  const stripped = html.replace(DATA_URL_RE, (dataUrl) => {
    let index = assets.indexOf(dataUrl);
    if (index === -1) index = assets.push(dataUrl) - 1;
    return `hf-asset://${index}`;
  });
  return { html: stripped, assets };
}

export function restoreAssets(html: string, assets: string[]): string {
  return html.replace(PLACEHOLDER_RE, (marker, index) => assets[Number(index)] ?? marker);
}
