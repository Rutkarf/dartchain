package io.dartchain.backend.showcase.infrastructure.web;

import io.dartchain.backend.showcase.dto.R4v3ShowcaseResponse;
import io.dartchain.backend.showcase.application.ShowcaseR4v3Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/showcase/r4v3")
public class ShowcaseR4v3Controller {

    private final ShowcaseR4v3Service showcaseR4v3Service;

    public ShowcaseR4v3Controller(ShowcaseR4v3Service showcaseR4v3Service) {
        this.showcaseR4v3Service = showcaseR4v3Service;
    }

    @GetMapping
    public R4v3ShowcaseResponse getDashboard(
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        return showcaseR4v3Service.getDashboard(source, limit, offset);
    }
}
