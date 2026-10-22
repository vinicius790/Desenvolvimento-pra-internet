# Segurança

## Relatar uma vulnerabilidade

Caso encontre alguma vulnerabilidade de segurança, reporte de forma responsável através da aba **Security → Report a vulnerability** no repositório GitHub ou por contato privado com os mantenedores. Evite a exposição pública de falhas em issues abertas.

Inclua:
- Passos detalhados para reproduzir o problema.
- Impacto e severidade estimada.
- Navegador e plataforma testados.

## Modelo e escopo do projeto

O **Desenvolvimento-pra-internet** é um portal educacional estático (HTML5, CSS3 e JavaScript client-side):
- **Arquitetura estática**: não há servidor de aplicação backend, base de dados ou APIs proprietárias executando em servidores remotos.
- **Formulários e interatividade**: formulários de exemplo (como `fale-conosco.html`) realizam validações locais; não transmitem credenciais nem realizam operações autenticadas.
- **Ausência de dados sensíveis**: o projeto não armazena nem processa senhas, tokens de autenticação ou dados pessoais em trânsito.

## Boas práticas para colaboradores

- Nunca faça commit de arquivos `.env`, chaves de API, credenciais ou backups compactados.
- Preserve a higienização de qualquer injeção no DOM, priorizando `textContent` sobre `innerHTML`.
- Recursos externos devem apontar exclusivamente para links seguros via HTTPS.
