package com.projectmind.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String senha;

    @Column(length = 20)
    private String role; // "ADMIN" ou "USER"

    @Column(name = "tentativas_falhas")
    private Integer tentativasFalhas = 0;

    @Column(name = "bloqueado_ate")
    private LocalDateTime bloqueadoAte;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Projeto> projetos;

    public Usuario() {}

    public Usuario(Long id, String nome, String email, String senha) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }

    public String getRole() {
        if (role != null && !role.isBlank()) {
            return role.toUpperCase();
        }
        return isAdmin() ? "ADMIN" : "USER";
    }

    public void setRole(String role) { this.role = role; }

    public boolean isAdmin() {
        if ("ADMIN".equalsIgnoreCase(this.role)) return true;
        return this.email != null && this.email.trim().equalsIgnoreCase("admin@projectmind.com");
    }

    public Integer getTentativasFalhas() {
        return tentativasFalhas != null ? tentativasFalhas : 0;
    }

    public void setTentativasFalhas(Integer tentativasFalhas) {
        this.tentativasFalhas = tentativasFalhas;
    }

    public LocalDateTime getBloqueadoAte() { return bloqueadoAte; }
    public void setBloqueadoAte(LocalDateTime bloqueadoAte) { this.bloqueadoAte = bloqueadoAte; }

    public boolean isBloqueado() {
        return bloqueadoAte != null && LocalDateTime.now().isBefore(bloqueadoAte);
    }

    public List<Projeto> getProjetos() { return projetos; }
    public void setProjetos(List<Projeto> projetos) { this.projetos = projetos; }
}
