package com.projectmind.controller;

import com.projectmind.domain.Usuario;
import com.projectmind.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    // Rota de Cadastro: POST /api/usuarios ou POST /api/usuarios/cadastro
    @PostMapping(value = {"", "/cadastro"})
    public ResponseEntity<?> cadastrar(@RequestBody Usuario usuario) {
        try {
            Usuario novoUsuario = usuarioService.cadastrar(usuario);

            Map<String, Object> response = new HashMap<>();
            response.put("id", novoUsuario.getId());
            response.put("userId", novoUsuario.getId());
            response.put("nome", novoUsuario.getNome());
            response.put("email", novoUsuario.getEmail());
            response.put("role", novoUsuario.getRole());
            response.put("isAdmin", novoUsuario.isAdmin());
            response.put("message", "Usuário cadastrado com sucesso!");

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("erro", e.getMessage(), "error", e.getMessage()));
        }
    }

    // Rota de Login: POST /api/usuarios/login
    // Payload: { "email": "usuario@email.com", "senha": "suasenhasecreta" }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciais) {
        try {
            String email = credenciais != null ? credenciais.get("email") : null;
            String senha = credenciais != null ? credenciais.get("senha") : null;

            Usuario usuarioLogado = usuarioService.fazerLogin(email, senha);

            Map<String, Object> response = new HashMap<>();
            response.put("id", usuarioLogado.getId());
            response.put("userId", usuarioLogado.getId());
            response.put("nome", usuarioLogado.getNome());
            response.put("email", usuarioLogado.getEmail());
            response.put("role", usuarioLogado.getRole());
            response.put("isAdmin", usuarioLogado.isAdmin());
            response.put("token", "pm-token-" + usuarioLogado.getId());
            response.put("message", "Login realizado com sucesso");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("erro", e.getMessage(), "error", e.getMessage()));
        }
    }

    // Listar todos os usuários: GET /api/usuarios
    @GetMapping
    public ResponseEntity<List<Usuario>> listar() {
        return ResponseEntity.ok(usuarioService.listarTodos());
    }

    // Buscar usuário por ID: GET /api/usuarios/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPorId(@PathVariable Long id) {
        return usuarioService.buscarPorId(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("erro", "Usuário não encontrado")));
    }

    // Atualizar dados do usuário: PUT /api/usuarios/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody Usuario usuario) {
        try {
            Usuario atualizado = usuarioService.atualizar(id, usuario);

            Map<String, Object> response = new HashMap<>();
            response.put("id", atualizado.getId());
            response.put("userId", atualizado.getId());
            response.put("nome", atualizado.getNome());
            response.put("email", atualizado.getEmail());
            response.put("role", atualizado.getRole());
            response.put("isAdmin", atualizado.isAdmin());
            response.put("message", "Informações atualizadas com sucesso!");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("erro", e.getMessage(), "error", e.getMessage()));
        }
    }

    // Excluir conta do usuário: DELETE /api/usuarios/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Long id) {
        try {
            usuarioService.deletar(id);
            return ResponseEntity.ok(Map.of("message", "Conta excluída com sucesso!"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("erro", e.getMessage(), "error", e.getMessage()));
        }
    }
}
