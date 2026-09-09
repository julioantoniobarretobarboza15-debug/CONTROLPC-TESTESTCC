# ControlPC — Como abrir no VS Code

## 1. Pré-requisitos
- Instale o **Node.js** (versão 20 ou superior): https://nodejs.org
- Instale o **VS Code**: https://code.visualstudio.com

## 2. Abrindo o projeto
1. Extraia este ZIP para uma pasta, ex.: `C:\projetos\controlpc` (ou `~/projetos/controlpc` no Mac/Linux).
2. Abra o VS Code → **Arquivo > Abrir Pasta...** → selecione a pasta `controlpc`.

## 3. Instalando as dependências
Abra o terminal do VS Code (**Terminal > Novo Terminal**) e rode:

```bash
npm install
```

(Se usar Bun: `bun install`)

## 4. Variáveis de ambiente
Crie um arquivo chamado `.env` na raiz da pasta com as chaves do seu banco
(as mesmas que o Lovable já configurou — estão em Settings > Cloud no painel do Lovable):

```
VITE_SUPABASE_URL=<url do seu projeto>
VITE_SUPABASE_PUBLISHABLE_KEY=<chave pública>
VITE_SUPABASE_PROJECT_ID=<id do projeto>
```

Sem esse arquivo, o site abre, mas o login e os dados não funcionam.

## 5. Rodando o site

```bash
npm run dev
```

Depois abra http://localhost:8080 no navegador.

## Onde está cada coisa
- `src/routes/index.tsx` — tela de login (o "HTML" da página inicial)
- `src/routes/painel.tsx` — painel com os 5 carrinhos e 200 notebooks
- `src/styles.css` — todo o visual (cores, tema roxo)
- `src/lib/auth.ts` — login e criação de conta
- `src/lib/controlpc.functions.ts` — o "back-end" (funções que rodam no servidor)
- `supabase/migrations/` — os comandos SQL que criam as tabelas do banco

## Observação
Este projeto usa React + TypeScript (que no final vira HTML + CSS + JavaScript no
navegador). É a stack do Lovable — para continuar editando com facilidade, recomendo
manter o projeto no Lovable e usar o VS Code para estudo/backup.
