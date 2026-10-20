// Gera tests/fixtures_ouro.json a partir do núcleo ORIGINAL (referência congelada do commit 6e0bdc9).
// Uso: node tests/gerar_fixtures.js
// Rodar só para (re)criar o contrato. Em M2, qualquer número que mudar precisa de ID de achado.
const fs = require('fs');
const path = require('path');
const { carregarOriginal } = require('./nucleo');
const { CENARIOS, executar } = require('./cenarios');

const orig = carregarOriginal();
const saida = {
    origem: 'index.html commit 6e0bdc9, linhas 269-513 (cópia congelada em tests/ref/nucleo_original_6e0bdc9.js)',
    gerado_em: new Date().toISOString(),
    node: process.version,
    tolerancia: 1e-9,
    cenarios: CENARIOS.map(c => ({ id: c.id, desc: c.desc, entrada: c, saida: executar(orig, c) }))
};
const destino = path.join(__dirname, 'fixtures_ouro.json');
fs.writeFileSync(destino, JSON.stringify(saida, null, 2) + '\n');
console.log('gravado', destino, '-', saida.cenarios.length, 'cenários');
