## Prato Certo

### Supabase

1. Crie um projeto no Supabase e execute `supabase-schema.sql` no SQL Editor.
2. Em Authentication > Providers, habilite Anonymous sign-ins.
3. Copie a URL do projeto e a chave `anon` para `supabase-config.js`.
4. Rode `npm run dev` e abra `http://localhost:8080`.

Sem a configuração, o app continua funcionando localmente usando `localStorage`.
