package com.projectmind.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping(value = {
            "/",
            "/login",
            "/cadastro",
            "/chat",
            "/projetos",
            "/projetos/{id}",
            "/projetos/{id}/analise",
            "/perfil"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}

