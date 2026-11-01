package com.projectmind.domain;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "tarefas")
public class Tarefa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String descricao;

    private Integer duracaoDias;
    private Integer ordemSequencial;

    @Column(length = 2)
    private String tipoDependencia; // TI, II, TT, IT

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "id_projeto")
    private Projeto projeto;

    @ManyToOne
    @JoinColumn(name = "id_sprint")
    private Sprint sprint;

    public Sprint getSprint() { return sprint; }
    public void setSprint(Sprint sprint) { this.sprint = sprint; }

    @ElementCollection
    @CollectionTable(name = "dependencias_tarefas", joinColumns = @JoinColumn(name = "id_sucessora"))
    @Column(name = "id_predecessora")
    private List<Long> idsPredecessoras;

    // Acompanhamento de execução (base da análise de atraso e das previsões)
    private Integer percentualConcluido; // 0 a 100 (nulo = 0)

    @Column(length = 20)
    private String status; // "A Fazer", "Fazendo", "Feito"

    private java.time.LocalDate dataInicioReal;
    private java.time.LocalDate dataConclusaoReal;

    public Tarefa() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public Integer getDuracaoDias() { return duracaoDias; }
    public void setDuracaoDias(Integer duracaoDias) { this.duracaoDias = duracaoDias; }

    public Integer getOrdemSequencial() { return ordemSequencial; }
    public void setOrdemSequencial(Integer ordemSequencial) { this.ordemSequencial = ordemSequencial; }

    public String getTipoDependencia() { return tipoDependencia; }
    public void setTipoDependencia(String tipoDependencia) { this.tipoDependencia = tipoDependencia; }

    public Projeto getProjeto() { return projeto; }
    public void setProjeto(Projeto projeto) { this.projeto = projeto; }

    public List<Long> getIdsPredecessoras() { return idsPredecessoras; }
    public void setIdsPredecessoras(List<Long> idsPredecessoras) { this.idsPredecessoras = idsPredecessoras; }

    public Integer getPercentualConcluido() { return percentualConcluido; }
    public void setPercentualConcluido(Integer percentualConcluido) { this.percentualConcluido = percentualConcluido; }

    public String getStatus() {
        if (status == null || status.trim().isEmpty()) {
            if (percentualConcluido != null && percentualConcluido == 100) return "Feito";
            if (percentualConcluido != null && percentualConcluido > 0) return "Fazendo";
            return "A Fazer";
        }
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public java.time.LocalDate getDataInicioReal() { return dataInicioReal; }
    public void setDataInicioReal(java.time.LocalDate dataInicioReal) { this.dataInicioReal = dataInicioReal; }

    public java.time.LocalDate getDataConclusaoReal() { return dataConclusaoReal; }
    public void setDataConclusaoReal(java.time.LocalDate dataConclusaoReal) { this.dataConclusaoReal = dataConclusaoReal; }
}
