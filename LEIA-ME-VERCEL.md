# Meu Treino — versão web (Vercel)

O app agora roda no navegador (celular e computador) e pode ser "instalado" na tela inicial (PWA).
O banco continua sendo o Supabase, sem mudanças.

## Subir na Vercel
1. Coloque a pasta do projeto num repositório do GitHub (`node_modules` e `dist` já estão no .gitignore).
2. Em https://vercel.com → **Add New → Project** → importe o repositório.
3. Framework Preset: **Other**. O `vercel.json` já define:
   - Build: `npx expo export -p web`
   - Output: `dist`
   - Rewrite para `index.html` (as rotas do app funcionam ao recarregar a página)
4. **Deploy**. Pronto: você recebe uma URL `https://seu-projeto.vercel.app`.

(Alternativa sem GitHub: `npm i -g vercel` e, na pasta do projeto, `vercel --prod`.)

## Configurar no Supabase (importante)
Em **Authentication → URL Configuration**:
- **Site URL**: a URL da Vercel (ou seu domínio próprio).
- **Redirect URLs**: adicione a mesma URL.

## Testar localmente
```bash
npm install
npm run web          # modo desenvolvimento
npx expo export -p web   # gera a pasta dist (igual ao que a Vercel faz)
```

## Instalar no celular
- Android (Chrome): menu ⋮ → **Instalar app** / Adicionar à tela inicial.
- iPhone (Safari): Compartilhar → **Adicionar à Tela de Início**.

## O que foi adaptado para a web
- `src/web/alertShim.web.js`: `Alert.alert`/`Alert.prompt` não funcionam no navegador; agora abrem um diálogo real (confirmações de apagar etc.).
- `src/web/DateTimePicker.web.js` + `metro.config.js`: seletor de data nativo do navegador.
- `src/utils/fileBytes*.js` e `fileExt.js`: upload de fotos/vídeos no navegador.
- Relatório mensal: abre a janela de impressão (escolha "Salvar como PDF").
- Push notifications (Expo) são ignoradas na web.
- No computador o app aparece centralizado em largura de celular (máx. 520px).
- `public/`: manifest, ícones e service worker (PWA).

## Limitações conhecidas
- Notificações push: só no app nativo. Na web não chegam avisos com o app fechado (as notificações dentro do app continuam funcionando).
- Layout é o de celular; não há layout específico de desktop.
- Itens a validar manualmente com login real: upload de vídeo grande, gráficos de evolução, chat.

## Layout no computador
Em janelas com 900px ou mais, o app usa menu lateral à esquerda, fontes/espaços maiores e área de conteúdo mais larga
(`src/utils/responsive.js` → `isDesktopWeb`, `APP_MAX_WIDTH`, `SIDEBAR_WIDTH`). Abaixo disso, mantém o layout de celular.
