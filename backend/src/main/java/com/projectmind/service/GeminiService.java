package com.projectmind.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private final RestTemplate restTemplate;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent}")
    private String apiUrl;

    @Value("${gemini.api.key:}")
    private String springApiKey;

    private final List<String> candidateKeys = new ArrayList<>();

    public GeminiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        String propKey = "";
        try (InputStream is = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            if (is != null) {
                Properties props = new Properties();
                props.load(is);
                propKey = extrairChaveLimpa(props.getProperty("gemini.api.key", ""));
            }
        } catch (Exception e) {
            log.error("Erro ao ler application.properties: {}", e.getMessage());
        }

        String envKey = extrairChaveLimpa(System.getenv("GEMINI_API_KEY"));
        String sysPropKey = extrairChaveLimpa(System.getProperty("GEMINI_API_KEY"));
        String springKey = extrairChaveLimpa(this.springApiKey);

        boolean isCloud = System.getenv("VERCEL") != null
                || System.getenv("RENDER") != null
                || System.getenv("RAILWAY_ENVIRONMENT") != null
                || "80".equals(System.getenv("PORT"));

        Set<String> orderedKeys = new LinkedHashSet<>();
        if (isCloud) {
            // Na nuvem (Vercel/Render/Railway), prioriza a variável GEMINI_API_KEY configurada no painel
            if (!envKey.isEmpty()) orderedKeys.add(envKey);
            if (!sysPropKey.isEmpty()) orderedKeys.add(sysPropKey);
            if (!springKey.isEmpty()) orderedKeys.add(springKey);
            if (!propKey.isEmpty()) orderedKeys.add(propKey);
        } else {
            // Localmente no Windows, prioriza o application.properties e usa variáveis de ambiente como fallback
            if (!propKey.isEmpty()) orderedKeys.add(propKey);
            if (!springKey.isEmpty()) orderedKeys.add(springKey);
            if (!envKey.isEmpty()) orderedKeys.add(envKey);
            if (!sysPropKey.isEmpty()) orderedKeys.add(sysPropKey);
        }

        candidateKeys.clear();
        candidateKeys.addAll(orderedKeys);

        log.info("GeminiService inicializado com {} chave(s) candidata(s) (Ambiente Cloud: {})", candidateKeys.size(), isCloud);
    }

    /**
     * Extrai o valor real caso a propriedade esteja no formato ${GEMINI_API_KEY:VALOR_PADRAO}
     */
    private String extrairChaveLimpa(String raw) {
        if (raw == null) return "";
        String val = raw.trim();
        if (val.startsWith("${") && val.endsWith("}")) {
            int colonIdx = val.indexOf(':');
            int eqIdx = val.indexOf('=');
            int sepIdx = colonIdx > 0 ? colonIdx : eqIdx;
            if (sepIdx > 0 && sepIdx < val.length() - 1) {
                val = val.substring(sepIdx + 1, val.length() - 1).trim();
            } else {
                return "";
            }
        }
        if (val.equalsIgnoreCase("SUA_CHAVE_AQUI") || val.isEmpty()) {
            return "";
        }
        if (val.startsWith("rev:")) {
            val = new StringBuilder(val.substring(4).trim()).reverse().toString();
        }
        return val;
    }

    /**
     * Envia o prompt diretamente para a API oficial do Google Gemini e retorna a resposta gerada.
     * Tenta automaticamente chaves alternativas em caso de 401/403 e faz retry em caso de 503/429.
     */
    public String gerarResposta(String promptSystem, String promptUser) {
        String promptCompleto = (promptSystem != null && !promptSystem.trim().isEmpty())
                ? promptSystem + "\n\n" + promptUser
                : promptUser;

        if (candidateKeys.isEmpty()) {
            init();
        }

        if (candidateKeys.isEmpty()) {
            log.warn("Chave GEMINI_API_KEY não configurada.");
            return "⚠️ A chave da API Gemini não foi configurada. Adicione a variável GEMINI_API_KEY nas Environment Variables da Vercel.";
        }

        String ultimoErro = "";

        for (String keyToUse : candidateKeys) {
            int maxTentativas = 3;
            String maskedKey = keyToUse.length() > 6
                    ? "..." + keyToUse.substring(keyToUse.length() - 6)
                    : "***";

            for (int tentativa = 1; tentativa <= maxTentativas; tentativa++) {
                try {
                    log.info("Enviando requisição para a API Google Gemini (tentativa {}/{}) com chave [{}]...", tentativa, maxTentativas, maskedKey);
                    String fullUrl = apiUrl + "?key=" + keyToUse;

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);

                    Map<String, Object> part = Map.of("text", promptCompleto);
                    Map<String, Object> content = Map.of("parts", List.of(part));
                    Map<String, Object> generationConfig = Map.of("temperature", 0.3);
                    Map<String, Object> requestBody = Map.of(
                        "contents", List.of(content),
                        "generationConfig", generationConfig
                    );

                    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
                    ResponseEntity<Map> response = restTemplate.postForEntity(fullUrl, entity, Map.class);

                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        Map responseBody = response.getBody();
                        List candidates = (List) responseBody.get("candidates");
                        if (candidates != null && !candidates.isEmpty()) {
                            Map firstCandidate = (Map) candidates.get(0);
                            Map contentMap = (Map) firstCandidate.get("content");
                            if (contentMap != null) {
                                List parts = (List) contentMap.get("parts");
                                if (parts != null && !parts.isEmpty()) {
                                    Map firstPart = (Map) parts.get(0);
                                    String respostaGemini = (String) firstPart.get("text");
                                    log.info("Resposta recebida com sucesso da API Gemini!");
                                    return respostaGemini;
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    ultimoErro = e.getMessage() != null ? e.getMessage() : "Erro desconhecido";
                    log.warn("Falha na API Gemini (tentativa {}/{}) com chave [{}]: {}", tentativa, maxTentativas, maskedKey, ultimoErro);

                    // Se for erro de chave inválida/expirada (401, 403, 400 API_KEY_INVALID), passa imediatamente para a próxima chave candidata
                    if (ultimoErro.contains("401") || ultimoErro.contains("403") || ultimoErro.contains("API_KEY_INVALID")) {
                        break;
                    }

                    // Se for erro 503 (High Demand) ou 429 (Rate Limit), aguarda e tenta novamente
                    if ((ultimoErro.contains("503") || ultimoErro.contains("429")) && tentativa < maxTentativas) {
                        try {
                            Thread.sleep(1200L * tentativa);
                        } catch (InterruptedException ignored) {}
                        continue;
                    }

                    if (tentativa == maxTentativas && ultimoErro.contains("503")) {
                        return "⚡ A API do Gemini está enfrentando um pico de alta demanda temporário no momento (Erro 503 nos servidores do Google). Por favor, aguarde alguns segundos e envie sua mensagem novamente!";
                    }
                }
            }
        }

        return "⚠️ Ocorreu um erro ao conectar à API da Gemini: " + ultimoErro + ". Verifique se a sua chave GEMINI_API_KEY é válida.";
    }
}
