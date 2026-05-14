# Festa Junina 27/06

Site público para convidados escolherem o que vão levar na Festa Junina.

## Arquivos principais

- `index.html`: página pública dos convidados.
- `styles.css`: visual do site.
- `script.js`: regras do formulário e envio das respostas.
- `config.js`: lugar onde entra o link do Google Apps Script.
- `google-apps-script-exemplo.js`: código para conectar com Google Sheets.

## Google Sheets

1. Crie uma planilha nova no Google Sheets.
2. Vá em `Extensões > Apps Script`.
3. Apague o código padrão.
4. Cole todo o conteúdo de `google-apps-script-exemplo.js`.
5. Clique em `Implantar > Nova implantação`.
6. Em tipo, escolha `App da Web`.
7. Em `Executar como`, escolha você.
8. Em `Quem pode acessar`, escolha `Qualquer pessoa`.
9. Clique em `Implantar` e copie o URL do App da Web.
10. Cole esse URL em `config.js`:

```js
window.FESTA_JUNINA_CONFIG = {
  appsScriptUrl: "COLE_AQUI_O_URL_DO_APP_DA_WEB"
};
```

As respostas vão cair na planilha. Esse é o seu acompanhamento privado. A página pública só recebe os totais por item para mostrar o que ainda está disponível; ela não recebe a lista de nomes.

## GitHub Pages

1. Crie um repositório no GitHub.
2. Envie estes arquivos para o repositório:
   - `.nojekyll`
   - `index.html`
   - `styles.css`
   - `script.js`
   - `config.js`
3. No GitHub, vá em `Settings > Pages`.
4. Em `Build and deployment`, escolha `Deploy from a branch`.
5. Escolha a branch `main` e a pasta `/root`.
6. Salve.

O GitHub vai gerar um link público parecido com:

```text
https://seu-usuario.github.io/nome-do-repositorio/
```

Envie esse link para os convidados.

Não publique uma página de acompanhamento no GitHub Pages se ela tiver dados dos convidados. Tudo que está no site público pode ser acessado por outras pessoas. Para acompanhar, use a planilha.
