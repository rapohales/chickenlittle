# 🐣 Nossa Rotina — calendário de academia & dieta pra casal

Um app de calendário compartilhado (pra celular) pra você e sua namorada marcarem
os dias que foram à academia e seguiram a dieta, e verem como cada um está.

- **Sem senha** — ao abrir, cada um toca em "quem sou eu".
- **Compartilhado em tempo real** — o que um marca, o outro vê na hora.
- Feito com **Next.js 16 + Supabase + Vercel**.

---

## 1. Criar o banco no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um **New project**
   (guarde a senha do banco; a região pode ser *South America (São Paulo)*).
2. No menu lateral, abra **SQL Editor → New query**.
3. Cole **todo** o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
   Isso cria as tabelas `people` e `day_logs` e já cadastra duas pessoas ("Você" e "Ela").
4. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public** (a chave pública `anon`)

## 2. Rodar no seu computador

1. Copie o arquivo de exemplo e preencha com os dados acima:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```

2. Instale as dependências e rode:

   ```bash
   npm install
   npm run dev
   ```

3. Abra [http://localhost:3000](http://localhost:3000). Toque em **Perfil** (canto
   superior direito) pra trocar os nomes ("Você" / "Ela") e as cores de cada um.

## 3. Publicar na Vercel

1. Suba o projeto pro GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
   > A raiz do app é a pasta `chickenlit`. Se o repositório tiver o app dentro dela,
   > defina o **Root Directory** = `chickenlit` nas configurações do projeto.
3. Em **Environment Variables**, adicione as mesmas duas variáveis do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**. Pronto — abra o link no celular e adicione à tela de início
   ("Adicionar à Tela de Início") pra usar como um app.

---

## Como usar

- **Painel do casal** (topo): quantos dias de academia e dieta cada um fez nesta
  semana, e o status de hoje.
- **Calendário**: cada dia mostra duas linhas de marcadores — uma por pessoa
  (cor de cada um). Cada linha tem duas barrinhas: **academia** | **dieta**.
- **Toque num dia** pra registrar academia, dieta e uma observação. Você também
  vê o que a outra pessoa marcou naquele dia.
- **Perfil** (canto superior direito): trocar de pessoa, renomear e mudar as cores.

## Sobre privacidade

Como não há login, quem tiver o link do site consegue acessar. Para um app privado
entre vocês dois isso costuma ser suficiente. Se um dia quiser proteger com senha,
dá pra migrar para o **Supabase Auth** (email/senha) sem refazer o resto.

## Estrutura

```
chickenlit/
├─ app/
│  ├─ components/
│  │  ├─ CalendarApp.tsx   # app principal (calendário, painel, realtime)
│  │  ├─ DayModal.tsx      # registro de um dia
│  │  ├─ ProfilePicker.tsx # tela "quem é você?"
│  │  └─ icons.tsx         # ícones SVG
│  ├─ globals.css          # tema escuro/energético
│  ├─ layout.tsx
│  └─ page.tsx
├─ lib/
│  ├─ supabase.ts          # cliente Supabase
│  ├─ types.ts             # tipos + paleta de cores
│  └─ dates.ts             # helpers de calendário
└─ supabase/
   └─ schema.sql           # rode isto no Supabase
```
