package io.dartchain.backend.quests.infrastructure.web;

import io.dartchain.backend.quests.application.QuestService;
import io.dartchain.backend.quests.dto.ExploreBlockRequest;
import io.dartchain.backend.quests.dto.QuestCatalogResponse;
import io.dartchain.backend.quests.dto.QuestProgressRequest;
import io.dartchain.backend.quests.dto.QuestProgressResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/quests")
public class QuestController {

    private final QuestService questService;

    public QuestController(QuestService questService) {
        this.questService = questService;
    }

    @GetMapping("/catalog")
    public QuestCatalogResponse getCatalog() {
        return questService.getCatalog();
    }

    @GetMapping("/state")
    public QuestProgressResponse getState(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return questService.getState(authorization);
    }

    @PostMapping("/progress")
    public QuestProgressResponse recordProgress(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody QuestProgressRequest request
    ) {
        return questService.recordProgress(authorization, request);
    }

    @PostMapping("/explore-block")
    public QuestProgressResponse exploreBlock(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody ExploreBlockRequest request
    ) {
        return questService.recordBlockExplored(authorization, request.blockIndex());
    }

    @PostMapping("/tasks/{taskId}/claim")
    public QuestProgressResponse claimTask(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String taskId
    ) {
        return questService.claimTask(authorization, taskId);
    }

    @PostMapping("/mission/claim")
    public QuestProgressResponse claimMission(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return questService.claimMission(authorization);
    }

    @PostMapping("/weekly/claim")
    public QuestProgressResponse claimWeekly(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return questService.claimWeekly(authorization);
    }
}
