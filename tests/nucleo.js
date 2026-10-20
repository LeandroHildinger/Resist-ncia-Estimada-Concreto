// Carrega os dois núcleos usados nos testes ouro:
//  - original: cópia congelada de index.html (commit 6e0bdc9, linhas 269-513)
//  - novo: js/calc.js (UMD)
const fs = require('fs');
const path = require('path');

const REF = path.join(__dirname, 'ref', 'nucleo_original_6e0bdc9.js');
const INDEX = path.join(__dirname, '..', 'index.html');

function carregarOriginal() {
    const src = fs.readFileSync(REF, 'utf8');
    return new Function(src + '\nreturn { Beta, DataValidator, Calculator };')();
}

function carregarNovo() {
    return require(path.join(__dirname, '..', 'js', 'calc.js'));
}

// Trecho do núcleo ainda embutido no index.html (enquanto o app não usa calc.js); null se não houver.
function trechoIndexAtual() {
    const html = fs.readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');
    const ini = html.indexOf('const Beta = {');
    const fim = html.indexOf('const App = {');
    if (ini < 0 || fim < 0) return null;
    return html.slice(ini, fim);
}

function trechoReferencia() {
    const src = fs.readFileSync(REF, 'utf8').replace(/\r\n/g, '\n');
    return src.slice(src.indexOf('const Beta = {'));
}

module.exports = { carregarOriginal, carregarNovo, trechoIndexAtual, trechoReferencia };
