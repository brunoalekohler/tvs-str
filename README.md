# Relógio e Agenda Corporativa Industrial

Sistema corporativo e industrial para exibição em TVs e monitores da fábrica/empresa:
- **Relógio digital** em tempo real com data, dia da semana e segundos
- **Alternância programada** entre relógio e agenda semanal de atividades
- **Alertas sonoros profissionais** (Web Audio API nativo, timbres harmônicos encorpados não estridentes)
- **Avisos em tela cheia** de troca de turnos (com mensagem de segurança e uso obrigatório de EPIs durante 1 minuto)
- **Integração em tempo real com Supabase** para agendamento e exclusão automática de eventos finalizados
- **Painel Administrativo (`/admin` ou botão no cabeçalho)** para gestão completa de eventos, testes de sirene/alertas e personalização da empresa

---

## 🚀 Como subir para o GitHub e publicar na Vercel

### Passo 1: Subir o projeto para o GitHub

1. No Google AI Studio, utilize o menu **Settings / Export** para exportar para o seu GitHub (ou faça o clone/download ZIP).
2. Se estiver usando o terminal localmente:
   ```bash
   git init
   git add .
   git commit -m "feat: relógio corporativo industrial com vercel config"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

---

### Passo 2: Publicar na Vercel

1. Acesse **[vercel.com](https://vercel.com)** e faça login com sua conta do GitHub.
2. Clique em **"Add New..."** -> **"Project"**.
3. Selecione o repositório que você acabou de enviar ao GitHub.
4. A Vercel detectará automaticamente as configurações do **Vite**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. *(Opcional)* Em **Environment Variables**, adicione as credenciais do Supabase se desejar carregar diretamente por variáveis de ambiente:
   - `VITE_SUPABASE_URL`: sua URL do projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: sua chave pública anon do Supabase
   *(Nota: você também pode configurar a qualquer momento direto pelo painel `/admin` da aplicação no navegador)*.
6. Clique em **"Deploy"**.
7. Pronto! Em poucos segundos seu site estará online com HTTPS gratuito e domínio `.vercel.app`.

---

## 🖼️ Logomarca da Empresa

A logo da sua empresa é carregada diretamente do repositório:
- O arquivo da logo fica em: **`public/logo.png`** (ou `public/logo.svg`).
- Para trocar a logo a qualquer momento, basta substituir o arquivo `public/logo.png` no seu repositório do GitHub e a Vercel atualizará o site automaticamente!
- Você também pode fazer upload ou trocar no painel de administração da própria aplicação.

---

## 💻 Comandos de Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Gerar build de produção
npm run build

# Pré-visualizar o build localmente
npm run preview
```
