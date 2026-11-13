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
            "/perfil"
    })
    public String redirectToFrontend() {
        return "redirect:https://projectmind-frontend.onrender.com";
    }
}
