# Imagem base: Nginx
FROM nginx:alpine
# Copia a pasta 'dist' (arquivos estáticos) para a pasta pública do Nginx
COPY dist /usr/share/nginx/html
# Config para SPA (try_files evita 404 em rotas do React Router)
COPY nginx-default.conf /etc/nginx/conf.d/default.conf
# Porta interna do Nginx
EXPOSE 80