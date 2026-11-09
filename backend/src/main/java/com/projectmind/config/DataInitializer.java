package com.projectmind.config;

import com.projectmind.domain.LicaoAprendida;
import com.projectmind.domain.Projeto;
import com.projectmind.domain.Tarefa;
import com.projectmind.domain.Usuario;
import com.projectmind.repository.LicaoAprendidaRepository;
import com.projectmind.repository.ProjetoRepository;
import com.projectmind.repository.TarefaRepository;
import com.projectmind.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final ProjetoRepository projetoRepository;
    private final TarefaRepository tarefaRepository;
    private final LicaoAprendidaRepository licaoAprendidaRepository;

    public DataInitializer(UsuarioRepository usuarioRepository,
                           ProjetoRepository projetoRepository,
                           TarefaRepository tarefaRepository,
                           LicaoAprendidaRepository licaoAprendidaRepository) {
        this.usuarioRepository = usuarioRepository;
        this.projetoRepository = projetoRepository;
        this.tarefaRepository = tarefaRepository;
        this.licaoAprendidaRepository = licaoAprendidaRepository;
    }

    @Override
    public void run(String... args) {
        // Executa de forma assíncrona em background para liberar a porta HTTP do container instantaneamente
        CompletableFuture.runAsync(this::inicializarDadosPadrao);
    }

    private void inicializarDadosPadrao() {
        try {
            if (usuarioRepository.count() == 0) {
                Usuario user = new Usuario();
                user.setNome("Usuário Teste");
                user.setEmail("admin@projectmind.com");
                user.setSenha("123456");
                usuarioRepository.save(user);

                // Projeto 1
                Projeto p1 = new Projeto();
                p1.setNome("Sistema de E-commerce");
                p1.setDescricao("Plataforma web de e-commerce com integração de pagamento, carrinho e catálogo.");
                p1.setDataInicio(LocalDate.now());
                p1.setDataFimPlanejada(LocalDate.now().plusMonths(3));
                p1.setUsuario(user);
                projetoRepository.save(p1);

                Tarefa t1 = new Tarefa();
                t1.setDescricao("Levantamento de Requisitos e Arquitetura");
                t1.setDuracaoDias(5);
                t1.setOrdemSequencial(1);
                t1.setTipoDependencia("TI");
                t1.setProjeto(p1);
                tarefaRepository.save(t1);

                Tarefa t2 = new Tarefa();
                t2.setDescricao("Modelagem do Banco de Dados");
                t2.setDuracaoDias(4);
                t2.setOrdemSequencial(2);
                t2.setTipoDependencia("TI");
                t2.setProjeto(p1);
                t2.setIdsPredecessoras(List.of(t1.getId()));
                tarefaRepository.save(t2);

                Tarefa t3 = new Tarefa();
                t3.setDescricao("Desenvolvimento do Backend REST API");
                t3.setDuracaoDias(10);
                t3.setOrdemSequencial(3);
                t3.setTipoDependencia("TI");
                t3.setProjeto(p1);
                t3.setIdsPredecessoras(List.of(t2.getId()));
                tarefaRepository.save(t3);

                Tarefa t4 = new Tarefa();
                t4.setDescricao("Integração do Frontend React");
                t4.setDuracaoDias(8);
                t4.setOrdemSequencial(4);
                t4.setTipoDependencia("TI");
                t4.setProjeto(p1);
                t4.setIdsPredecessoras(List.of(t3.getId()));
                tarefaRepository.save(t4);

                // Projeto 2
                Projeto p2 = new Projeto();
                p2.setNome("Migração Cloud AWS");
                p2.setDescricao("Migração de infraestrutura local para AWS ECS e RDS.");
                p2.setDataInicio(LocalDate.now().minusDays(10));
                p2.setDataFimPlanejada(LocalDate.now().plusMonths(2));
                p2.setUsuario(user);
                projetoRepository.save(p2);
            }

            if (licaoAprendidaRepository.count() <= 2) {
                Set<String> existentes = licaoAprendidaRepository.findAll().stream()
                    .map(l -> l.getDescricaoConhecimento() != null ? l.getDescricaoConhecimento().toLowerCase() : "")
                    .collect(Collectors.toSet());

                salvarSeNaoExistir(existentes, "Geral", "Definir contratos de API antecipadamente reduz retrabalho entre frontend e backend em 30%.");
                salvarSeNaoExistir(existentes, "Riscos", "Mudanças de escopo solicitadas pelo cliente devem passar por análise de impacto no caminho crítico antes da aprovação.");
                salvarSeNaoExistir(existentes, "Cronograma", "Integrar gateways de pagamento em ambiente sandbox com antecedência evita gargalos na reta final de entrega.");
                salvarSeNaoExistir(existentes, "Cronograma", "Validações de estoque e regras de negócio críticas devem possuir testes automatizados antes da homologação.");
                salvarSeNaoExistir(existentes, "Arquitetura", "Padronizar componentes visuais da página inicial e listagens acelera o desenvolvimento das telas subsequentes.");
                salvarSeNaoExistir(existentes, "Riscos", "Validar permissões IAM antes da migração de banco evita indisponibilidade em produção.");
            }
        } catch (Exception ignored) {}
    }

    private void salvarSeNaoExistir(Set<String> existentes, String categoria, String descricao) {
        if (!existentes.contains(descricao.toLowerCase())) {
            LicaoAprendida l = new LicaoAprendida();
            l.setCategoria(categoria);
            l.setDescricaoConhecimento(descricao);
            licaoAprendidaRepository.save(l);
            existentes.add(descricao.toLowerCase());
        }
    }
}
