package com.projectmind.controller;

import com.projectmind.domain.Usuario;
import com.projectmind.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Permite chamadas vindas do Frontend em React
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        try {
            String email = loginData != null ? loginData.get("email") : null;
            String senha = loginData != null ? loginData.get("senha") : null;

            Usuario usuario = usuarioService.fazerLogin(email, senha);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login realizado com sucesso");
            response.put("token", "pm-token-" + usuario.getId());
            response.put("userId", usuario.getId());
            response.put("id", usuario.getId());
            response.put("nome", usuario.getNome());
            response.put("email", usuario.getEmail());
            response.put("role", usuario.getRole());
            response.put("isAdmin", usuario.isAdmin());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage(), "erro", e.getMessage()));
        }
    }

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> cadastrar(@RequestBody Usuario usuario) {
        try {
            Usuario novoUsuario = usuarioService.cadastrar(usuario);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Usuário cadastrado com sucesso!");
            response.put("userId", novoUsuario.getId());
            response.put("id", novoUsuario.getId());
            response.put("nome", novoUsuario.getNome());
            response.put("email", novoUsuario.getEmail());
            response.put("role", novoUsuario.getRole());
            response.put("isAdmin", novoUsuario.isAdmin());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage(), "erro", e.getMessage()));
        }
    }
}
