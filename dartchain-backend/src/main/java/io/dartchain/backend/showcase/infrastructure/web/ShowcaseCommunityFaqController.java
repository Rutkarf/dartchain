package io.dartchain.backend.showcase.infrastructure.web;

import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.showcase.dto.CreateFaqQuestionRequest;
import io.dartchain.backend.showcase.dto.FaqQuestionResponse;
import io.dartchain.backend.showcase.dto.FaqQuestionsListResponse;
import io.dartchain.backend.showcase.dto.FaqVoteRequest;
import io.dartchain.backend.showcase.dto.UpdateFaqQuestionStatusRequest;
import io.dartchain.backend.showcase.application.CommunityFaqService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/showcase/faq")
public class ShowcaseCommunityFaqController {

    private final CommunityFaqService communityFaqService;

    public ShowcaseCommunityFaqController(CommunityFaqService communityFaqService) {
        this.communityFaqService = communityFaqService;
    }

    @GetMapping("/questions")
    public FaqQuestionsListResponse listQuestions(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "rank") String sort,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @AuthenticationPrincipal AuthenticatedUser viewer
    ) {
        return communityFaqService.listQuestions(status, sort, limit, offset, viewer);
    }

    @GetMapping("/questions/latest")
    public FaqQuestionResponse getLatestQuestion(@AuthenticationPrincipal AuthenticatedUser viewer) {
        return communityFaqService.getLatest(viewer);
    }

    @GetMapping("/questions/popular")
    public FaqQuestionsListResponse getPopularQuestions(
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal AuthenticatedUser viewer
    ) {
        return communityFaqService.getPopular(limit, viewer);
    }

    @GetMapping("/questions/pinned")
    public FaqQuestionsListResponse getPinnedQuestions(
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal AuthenticatedUser viewer
    ) {
        return communityFaqService.getPinned(limit, viewer);
    }

    @PostMapping("/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public FaqQuestionResponse createQuestion(
            @Valid @RequestBody CreateFaqQuestionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return communityFaqService.createQuestion(request, user);
    }

    @PostMapping("/questions/{id}/vote")
    public FaqQuestionResponse voteQuestion(
            @PathVariable String id,
            @Valid @RequestBody FaqVoteRequest request,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return communityFaqService.vote(id, request, user);
    }

    @PatchMapping("/questions/{id}/status")
    public FaqQuestionResponse updateQuestionStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateFaqQuestionStatusRequest request,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return communityFaqService.updateStatus(id, request, user);
    }
}
