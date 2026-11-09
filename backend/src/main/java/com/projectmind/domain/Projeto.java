package com.projectmind.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "projetos")
public class Projeto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    private LocalDate dataInicio;
    private LocalDate dataFimPlanejada;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @OrderBy("id ASC")
    @BatchSize(size = 50)
    @OneToMany(mappedBy = "projeto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Tarefa> tarefas;

    @BatchSize(size = 50)
    @OneToMany(mappedBy = "projeto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Risco> riscos;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "projeto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FeedbackIA> feedbacksIA;

    public Projeto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public LocalDate getDataInicio() { return dataInicio; }
    public void setDataInicio(LocalDate dataInicio) { this.dataInicio = dataInicio; }

    public LocalDate getDataFimPlanejada() { return dataFimPlanejada; }
    public void setDataFimPlanejada(LocalDate dataFimPlanejada) { this.dataFimPlanejada = dataFimPlanejada; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public List<Tarefa> getTarefas() { return tarefas; }
    public void setTarefas(List<Tarefa> tarefas) { this.tarefas = tarefas; }

    public List<Risco> getRiscos() { return riscos; }
    public void setRiscos(List<Risco> riscos) { this.riscos = riscos; }

    public List<FeedbackIA> getFeedbacksIA() { return feedbacksIA; }
    public void setFeedbacksIA(List<FeedbackIA> feedbacksIA) { this.feedbacksIA = feedbacksIA; }
}
