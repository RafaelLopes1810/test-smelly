const { UserService } = require('../src/userService');

function criarServicoLimpo() {
  const userService = new UserService();
  userService._clearDB();
  return userService;
}

describe('UserService - Suíte de Testes Limpa', () => {
  test('deve criar usuário ativo com os dados informados', () => {
    // Arrange
    const userService = criarServicoLimpo();
    const nome = 'Fulano de Tal';
    const email = 'fulano@teste.com';
    const idade = 25;

    // Act
    const usuarioCriado = userService.createUser(nome, email, idade);

    // Assert
    expect(usuarioCriado.id).toEqual(expect.any(String));
    expect(usuarioCriado).toMatchObject({
      nome,
      email,
      idade,
      isAdmin: false,
      status: 'ativo',
    });
  });

  test('deve localizar usuário cadastrado pelo identificador', () => {
    // Arrange
    const userService = criarServicoLimpo();
    const usuarioCriado = userService.createUser('Fulano', 'fulano@teste.com', 25);

    // Act
    const usuarioBuscado = userService.getUserById(usuarioCriado.id);

    // Assert
    expect(usuarioBuscado).toMatchObject({
      id: usuarioCriado.id,
      nome: 'Fulano',
      status: 'ativo',
    });
  });

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

  test('deve incluir os usuários cadastrados no relatório', () => {
    // Arrange
    const userService = criarServicoLimpo();
    userService.createUser('Alice', 'alice@email.com', 28);
    userService.createUser('Bob', 'bob@email.com', 32);

    // Act
    const relatorio = userService.generateUserReport();

    // Assert
    expect(relatorio).toContain('--- Relatório de Usuários ---');
    expect(relatorio).toContain('Nome: Alice');
    expect(relatorio).toContain('Nome: Bob');
    expect(relatorio).toContain('Status: ativo');
  });

  test('deve rejeitar usuário menor de idade', () => {
    // Arrange
    const userService = criarServicoLimpo();

    // Act
    const criarUsuarioMenor = () => userService.createUser('Menor', 'menor@email.com', 17);

    // Assert
    expect(criarUsuarioMenor).toThrow('O usuário deve ser maior de idade.');
  });

  test('deve informar que não há usuários em um relatório vazio', () => {
    // Arrange
    const userService = criarServicoLimpo();

    // Act
    const relatorio = userService.generateUserReport();

    // Assert
    expect(relatorio).toContain('Nenhum usuário cadastrado.');
  });
});
