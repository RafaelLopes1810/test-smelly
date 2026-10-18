# Relatório de Test Smells

## Ambiente e preparação

- Repositório: fork de `RafaelLopes1810/test-smelly`.
- Node.js: `v24.21.0`.
- npm: `11.19.0`.
- Jest: `29.7.0` (já presente no projeto).
- ESLint instalado inicialmente: `10.13.0`. Como essa versão não usa `.eslintrc.json` como configuração padrão, foi substituída pela versão `8.57.1`, conforme solicitado.
- `eslint-plugin-jest`: `29.17.0`.
- `npm install` terminou com sucesso. O npm reportou 33 vulnerabilidades na árvore de dependências (5 moderadas e 28 altas); não foi executado `npm audit fix`.
- Suíte inicial: 1 arquivo, 5 testes declarados, dos quais 4 passaram e 1 estava ignorado.

## Escopo e localização

O snapshot inicial do workspace e a descrição mencionavam `__tests__/`, mas o repositório contém `test/userService.smelly.test.js`; não há pasta `__tests__/`. Para manter a estrutura real do projeto e não mover nem alterar o teste protegido, a suíte limpa foi criada em `test/userService.clean.test.js`.

`src/userService.js` mantém usuários em memória. Ele oferece `createUser` (com validação de campos obrigatórios e idade mínima de 18 anos), `getUserById`, `deactivateUser` (admins não podem ser desativados) e `generateUserReport`. A suíte smelly cobre criação/busca juntas, desativação de usuário comum e administrador em um mesmo teste, geração do relatório e validação de idade; o teste do relatório vazio está ignorado.

## Análise manual anterior ao ESLint

Esta análise foi registrada a partir da leitura do teste antes da primeira execução do linter.

| Smell | Teste/linha | Por que é um mau cheiro | Risco |
|---|---|---|---|
| The Giant / Eager Test | `deve criar e buscar um usuário corretamente`, linhas 18–30 | O mesmo teste cria um usuário e depois verifica sua busca, cobrindo dois comportamentos/métodos. | Uma falha mistura causas; a suíte fica menos diagnóstica e mudanças independentes exigem editar o mesmo teste. |
| Conditional Logic | `deve desativar usuários se eles não forem administradores`, linhas 33–51; `deve falhar ao criar usuário menor de idade`, linhas 66–74 | O primeiro usa `for` e `if` para executar cenários e expectativas diferentes. O segundo usa `try/catch` e só executa a expectativa quando há exceção. | Um cenário pode não executar a verificação pretendida; os resultados ficam dependentes dos caminhos do fluxo de controle. |
| Teste que pode passar sem verificar o comportamento (falha silenciosa) | `deve falhar ao criar usuário menor de idade`, linhas 66–74 | Se `createUser` não lançar exceção, o teste termina sem falhar. A expectativa no `catch` não prova que a exceção ocorreu. | A remoção da validação de idade pode escapar da suíte e produzir falso positivo. |
| Fragile Test | `deve gerar um relatório de usuários formatado`, linhas 54–63 | A expectativa monta e exige uma linha completa com ID, pontuação, ordem, espaços e quebra de linha. A checagem do cabeçalho também depende de um prefixo textual exato. | Alterações de apresentação não relevantes ao comportamento podem quebrar o teste. |
| General Fixture (leve) | `dadosUsuarioPadrao`, linhas 3–7, usado no teste das linhas 18–30 | O objeto fica em escopo global do arquivo embora seja utilizado por um único teste. O `beforeEach` cria o serviço, que é necessário em todos os testes; portanto, esse setup comum não é considerado excessivo por si só. | A fixture global esconde os dados de entrada do cenário que a usa e pode ser alterada sem ser percebida nesse teste. |
| Assertion Roulette (risco localizado) | Teste de criação/busca, linhas 25–30; teste de desativação, linhas 44–49 | Há várias expectativas cobrindo operações diferentes no primeiro teste e expectativas em ramos diferentes no segundo, sem isolamento por cenário. | Quando uma falha ocorre, é menos claro qual comportamento independente está quebrado. |
| Teste desabilitado | `test.skip('deve retornar uma lista vazia quando não há usuários'...)`, linha 77 | O caso é ignorado e não tem nenhuma expectativa. | A ausência de usuários no relatório fica sem verificação e a suíte dá uma impressão incompleta de cobertura. |

Não encontrei Mystery Guest: os dados usados pelos testes são definidos no próprio arquivo, sem depender de banco ou arquivo externo. Também não encontrei Sleeper/esperas arbitrárias nem Redundant Assertion. A presença de `_clearDB()` no código de produção é uma decisão de projeto para permitir limpeza do estado em memória; não foi alterado porque a implementação está fora do escopo protegido.

## Três smells para destacar

### 1. Conditional Logic

Trecho real de `test/userService.smelly.test.js`:

```js
for (const user of todosOsUsuarios) {
  const resultado = userService.deactivateUser(user.id);
  if (!user.isAdmin) {
    expect(resultado).toBe(true);
    const usuarioAtualizado = userService.getUserById(user.id);
    expect(usuarioAtualizado.status).toBe('inativo');
  } else {
    expect(resultado).toBe(false);
  }
}
```

O teste processa dois cenários por iteração e condiciona a execução das expectativas. O risco é um caso não executar as verificações adequadas; além disso, uma falha não identifica claramente qual regra de negócio foi quebrada.

### 2. The Giant / Eager Test

Trecho real:

```js
test('deve criar e buscar um usuário corretamente', () => {
  const usuarioCriado = userService.createUser(
    dadosUsuarioPadrao.nome,
    dadosUsuarioPadrao.email,
    dadosUsuarioPadrao.idade
  );
  expect(usuarioCriado.id).toBeDefined();

  const usuarioBuscado = userService.getUserById(usuarioCriado.id);
  expect(usuarioBuscado.nome).toBe(dadosUsuarioPadrao.nome);
  expect(usuarioBuscado.status).toBe('ativo');
});
```

O título explicita dois comportamentos, criação e busca. Uma falha de qualquer um faz o mesmo teste falhar e torna o diagnóstico menos preciso.

### 3. Falha silenciosa na expectativa de exceção

Trecho real:

```js
try {
  userService.createUser('Menor', 'menor@email.com', 17);
} catch (e) {
  expect(e.message).toBe('O usuário deve ser maior de idade.');
}
```

Não existe uma asserção de que a chamada deve lançar exceção; se ela retornar normalmente, nenhum `expect` executa e o teste passa. Isso pode esconder uma regressão na validação de idade.

## Primeira execução do ESLint

A saída integral foi registrada em `relatorio/eslint-primeira-execucao.txt` e também exibida no terminal:

```text
C:\Users\T-GAMER\Documents\GitHub\test-smelly\test\userService.smelly.test.js
  44:9  error    Avoid calling `expect` conditionally`  jest/no-conditional-expect
  46:9  error    Avoid calling `expect` conditionally`  jest/no-conditional-expect
  49:9  error    Avoid calling `expect` conditionally`  jest/no-conditional-expect
  73:7  error    Avoid calling `expect` conditionally`  jest/no-conditional-expect
  77:3  warning  Tests should not be skipped            jest/no-disabled-tests
  77:3  warning  Test has no assertions                 jest/expect-expect

✖ 6 problems (4 errors, 2 warnings)
```

Resumo: 6 problemas no total, sendo 4 erros e 2 avisos, todos em `test/userService.smelly.test.js`.

| Regra | Ocorrências | Local | Nível |
|---|---:|---|---|
| `jest/no-conditional-expect` | 4 | Linhas 44, 46, 49 e 73 | Erro |
| `jest/no-disabled-tests` | 1 | Linha 77 | Aviso |
| `jest/expect-expect` | 1 | Linha 77 | Aviso |

## Análise manual versus ferramenta

O ESLint detectou automaticamente expectativas condicionais nos ramos de desativação e no `catch`, além do teste ignorado e sem asserções. Isso dá evidência automática para partes de Conditional Logic e para o teste desabilitado.

O linter não apontou diretamente o `for`/`if` como smell abstrato, não identificou o teste que combina criação e busca como Giant/Eager Test, não avaliou o acoplamento do relatório ao formato exato (Fragile Test), não avaliou a fixture global (General Fixture), nem concluiu que o `try/catch` passa quando nenhuma exceção é lançada. A regra `jest/no-conditional-expect` apenas sinaliza expectativas dentro de caminhos condicionais; ela não substitui a análise do comportamento do teste. A configuração também não contém regras específicas para esses smells de design/manutenibilidade.

## Refatoração em destaque: desativação

### Antes — um teste com dois cenários e fluxo condicional

```js
test('deve desativar usuários se eles não forem administradores', () => {
  const usuarioComum = userService.createUser('Comum', 'comum@teste.com', 30);
  const usuarioAdmin = userService.createUser('Admin', 'admin@teste.com', 40, true);

  const todosOsUsuarios = [usuarioComum, usuarioAdmin];

  for (const user of todosOsUsuarios) {
    const resultado = userService.deactivateUser(user.id);
    if (!user.isAdmin) {
      expect(resultado).toBe(true);
      const usuarioAtualizado = userService.getUserById(user.id);
      expect(usuarioAtualizado.status).toBe('inativo');
    } else {
      expect(resultado).toBe(false);
    }
  }
});
```

### Depois — casos isolados com AAA

```js
test('deve desativar usuário comum e atualizar seu status', () => {
  // Arrange
  const userService = criarServicoLimpo();
  const usuarioComum = userService.createUser('Comum', 'comum@teste.com', 30);

  // Act
  const resultado = userService.deactivateUser(usuarioComum.id);

  // Assert
  expect(resultado).toBe(true);
  expect(userService.getUserById(usuarioComum.id).status).toBe('inativo');
});

test('não deve desativar usuário administrador', () => {
  // Arrange
  const userService = criarServicoLimpo();
  const usuarioAdmin = userService.createUser('Admin', 'admin@teste.com', 40, true);

  // Act
  const resultado = userService.deactivateUser(usuarioAdmin.id);

  // Assert
  expect(resultado).toBe(false);
  expect(userService.getUserById(usuarioAdmin.id).status).toBe('ativo');
});
```

Separar os casos remove o loop e os ramos condicionais (Conditional Logic), transforma cada cenário em um teste focado (The Giant / Eager Test) e faz cada resultado ser interpretável sem depender de um ramo interno. Ambos os resultados originais continuam cobertos: usuário comum é desativado e admin continua ativo.

## Resumo geral da refatoração

| Smell/sinal | Correção no arquivo limpo |
|---|---|
| The Giant / Eager Test | Criação e busca foram separadas; desativação comum e de admin também foram separadas. |
| Conditional Logic | Removidos loop, `if` e `try/catch` dos testes. Cada cenário de desativação tem seu próprio teste. |
| Falha silenciosa na expectativa | Validação de menoridade usa `expect(fn).toThrow(...)`, que falha se a exceção não for lançada. |
| Fragile Test | O relatório verifica conteúdo e usuários com `toContain`, sem comparar uma linha montada com ID, ordem e quebra de linha exatos. |
| General Fixture | Dados do usuário são declarados no Arrange do teste; serviço e limpeza são obtidos por `criarServicoLimpo()` no cenário que os utiliza, em vez de fixture global e `beforeEach`. |
| Assertion Roulette | Testes separados por comportamento; criação e busca usam `toMatchObject` para agrupar propriedades relacionadas em uma expectativa descritiva. |
| Teste desabilitado/sem asserção | O cenário de relatório vazio foi habilitado e agora verifica a mensagem de ausência de usuários. |
| Mystery Guest, Sleeper, Redundant Assertion | Não havia ocorrência encontrada na suíte smelly; não foi necessário alterar esses aspectos. |

Contagem: o arquivo smelly tem 5 testes declarados (4 aprovados e 1 ignorado na execução inicial); o arquivo limpo tem 7 testes, todos aprovados. Na execução completa, foram 11 aprovados e 1 ignorado, 12 testes declarados no total.

## Validação final

- `npx eslint test/userService.clean.test.js`: terminou sem erros nem avisos. A saída foi registrada em `relatorio/eslint-clean.txt` como `sem erros nem avisos`.
- `npx eslint .`: apontou novamente somente os 6 problemas já descritos no arquivo smelly (4 erros e 2 avisos); o arquivo limpo não gerou problemas.
- `npm test`: 2 suítes passaram; `test/userService.clean.test.js` passou com 7 testes e `test/userService.smelly.test.js` passou com 4 testes e 1 ignorado. Total: 11 aprovados, 1 ignorado (12 declarados).
- `src/userService.js` e `test/userService.smelly.test.js` não foram editados; a conferência final de `git diff` nesses caminhos não apresentou diferenças.
- Nenhum comando de commit, push ou alteração do índice do Git foi executado.

## Observações

- A configuração `.eslintrc.json` solicitada funcionou com ESLint 8.57.1 e `sourceType: "module"`; não ocorreu erro de parsing com `require`/`module.exports`.
- A estrutura real usa `test/`, e não `__tests__/`; o arquivo limpo e os comandos de validação respeitam a pasta existente.
- A mudança de contagem no arquivo limpo vem da divisão dos cenários e da ativação do teste antes ignorado. Nenhum comportamento anteriormente verificado foi removido.
- A instalação de dependências informou 33 vulnerabilidades; não foram aplicadas correções automáticas porque isso seria uma alteração fora do escopo do trabalho.
