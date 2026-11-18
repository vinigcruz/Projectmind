package com.projectmind.service;

import com.projectmind.domain.Usuario;
import com.projectmind.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    // Salvar ou cadastrar novo usuário
    public Usuario cadastrar(Usuario usuario) {
        if (usuario == null) {
            throw new RuntimeException("Dados do usuário não fornecidos!");
        }

        if (usuario.getNome() == null || usuario.getNome().trim().isEmpty()) {
            throw new RuntimeException("O nome é obrigatório!");
        }

        if (usuario.getEmail() == null || usuario.getEmail().trim().isEmpty()) {
            throw new RuntimeException("O e-mail é obrigatório!");
        }

        if (usuario.getSenha() == null || usuario.getSenha().trim().isEmpty()) {
            throw new RuntimeException("A senha é obrigatória!");
        }

        String emailFormatado = usuario.getEmail().trim().toLowerCase();
        usuario.setEmail(emailFormatado);
        usuario.setNome(usuario.getNome().trim());
        // Cadastro público SEMPRE cria usuário padrão (USER). Promoção para ADMIN só ocorre via Painel Admin.
        usuario.setRole("USER");

        if (usuarioRepository.existsByEmail(emailFormatado)) {
            throw new RuntimeException("E-mail já cadastrado no sistema!");
        }

        return usuarioRepository.save(usuario);
    }

    // Método para validar o login
    public Usuario fazerLogin(String email, String senha) {
        if (email == null || email.trim().isEmpty() || senha == null || senha.trim().isEmpty()) {
            throw new RuntimeException("E-mail e senha são obrigatórios!");
        }

        String emailFormatado = email.trim().toLowerCase();
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(emailFormatado);

        // Fallback caso usuário tenha sido cadastrado mantendo maiúsculas
        if (usuarioOpt.isEmpty()) {
            usuarioOpt = usuarioRepository.findByEmail(email.trim());
        }

        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            if (usuario.getSenha() != null && usuario.getSenha().equals(senha.trim())) {
                return usuario;
            }
        }

        throw new RuntimeException("E-mail ou senha inválidos!");
    }

    public List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    public Optional<Usuario> buscarPorId(Long id) {
        return usuarioRepository.findById(id);
    }

    public Optional<Usuario> buscarPorEmail(String email) {
        if (email == null) return Optional.empty();
        return usuarioRepository.findByEmail(email.trim().toLowerCase());
    }

    @org.springframework.transaction.annotation.Transactional
    public Usuario atualizar(Long id, Usuario dadosAtualizados) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado!"));

        if (dadosAtualizados.getNome() != null && !dadosAtualizados.getNome().trim().isEmpty()) {
            usuario.setNome(dadosAtualizados.getNome().trim());
        }

        if (dadosAtualizados.getEmail() != null && !dadosAtualizados.getEmail().trim().isEmpty()) {
            String novoEmail = dadosAtualizados.getEmail().trim().toLowerCase();
            if (!novoEmail.equalsIgnoreCase(usuario.getEmail())) {
                if (usuarioRepository.existsByEmail(novoEmail)) {
                    throw new RuntimeException("Este e-mail já está em uso por outro usuário!");
                }
                usuario.setEmail(novoEmail);
            }
        }

        if (dadosAtualizados.getSenha() != null && !dadosAtualizados.getSenha().trim().isEmpty()) {
            usuario.setSenha(dadosAtualizados.getSenha().trim());
        }

        return usuarioRepository.save(usuario);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deletar(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado!"));
        usuarioRepository.delete(usuario);
    }
}
