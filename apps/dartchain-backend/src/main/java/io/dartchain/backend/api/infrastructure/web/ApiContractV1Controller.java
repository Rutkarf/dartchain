package io.dartchain.backend.api.infrastructure.web;

import io.dartchain.backend.api.ApiContractCatalog;
import io.dartchain.backend.api.ApiContractV1Response;
import io.dartchain.backend.config.ApiRoutes;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.API_V1_PREFIX)
public class ApiContractV1Controller {

    @GetMapping("/contract")
    public ApiContractV1Response contract() {
        return ApiContractCatalog.build();
    }
}
