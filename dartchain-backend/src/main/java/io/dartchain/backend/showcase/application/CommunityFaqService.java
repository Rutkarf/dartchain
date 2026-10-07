package io.dartchain.backend.showcase.application;

import io.dartchain.backend.auth.application.AuthException;
import io.dartchain.backend.auth.model.UserRole;
import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.showcase.dto.CreateFaqQuestionRequest;
import io.dartchain.backend.showcase.dto.FaqQuestionResponse;
import io.dartchain.backend.showcase.dto.FaqQuestionsListResponse;
import io.dartchain.backend.showcase.dto.FaqVoteRequest;
import io.dartchain.backend.showcase.dto.UpdateFaqQuestionStatusRequest;
import io.dartchain.backend.showcase.faq.store.FaqQuestionStore;
import io.dartchain.backend.showcase.model.FaqQuestion;
import io.dartchain.backend.showcase.model.FaqQuestionStatus;
import io.dartchain.backend.showcase.model.FaqVoteDirection;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class CommunityFaqService {

    /** Community score threshold for automatic pinning (DEX-style ranking). */
    public static final int AUTO_PIN_SCORE_THRESHOLD = 5;

    private final FaqQuestionStore faqQuestionStore;

    public CommunityFaqService(FaqQuestionStore faqQuestionStore) {
        this.faqQuestionStore = faqQuestionStore;
    }

    @PostConstruct
    public void seedIfEmpty() {
        if (!faqQuestionStore.findAll().isEmpty()) {
            return;
        }

        Instant now = Instant.now();
        List<FaqQuestion> seeded = List.of(
                question(
                        "faq-1",
                        "seed-user-1",
                        "NovaTrader",
                        "Le peg CHF est-il garanti on-chain ?",
                        "Je vois 1 R4V3 = 1 CHF partout. Est-ce enforce on-chain ou seulement UI ?",
                        now.minusSeconds(86_400 * 2),
                        FaqQuestionStatus.ACTIVE,
                        8,
                        9,
                        1,
                        1,
                        false
                ),
                question(
                        "faq-2",
                        "seed-user-2",
                        "LaunchDev",
                        "Différence m4t3r vs R4V3 dans le swap ?",
                        "Pourquoi l'exchange affiche m4t3r et pas R4V3 directement ?",
                        now.minusSeconds(86_400),
                        FaqQuestionStatus.ACTIVE,
                        5,
                        6,
                        1,
                        1,
                        false
                ),
                question(
                        "faq-3",
                        "seed-user-3",
                        "SwissHODL",
                        "Quelle est la prochaine évolution du protocole R4V3 ?",
                        "Y a-t-il une roadmap mainnet ou de nouvelles fonctionnalités governance ?",
                        now.minusSeconds(3_600),
                        FaqQuestionStatus.ACTIVE,
                        2,
                        2,
                        0,
                        0,
                        true
                )
        );

        faqQuestionStore.saveAll(seeded);
    }

    public FaqQuestionsListResponse listQuestions(
            String statusFilter,
            String sort,
            int limit,
            int offset,
            AuthenticatedUser viewer
    ) {
        List<FaqQuestion> visible = faqQuestionStore.findAll().stream()
                .filter(question -> matchesStatusFilter(question, statusFilter))
                .sorted(resolveComparator(sort))
                .toList();

        int safeOffset = Math.max(0, offset);
        int safeLimit = Math.max(1, Math.min(limit, 100));
        int toIndex = Math.min(visible.size(), safeOffset + safeLimit);
        int fromIndex = Math.min(visible.size(), safeOffset);

        List<FaqQuestionResponse> page = visible.subList(fromIndex, toIndex).stream()
                .map(question -> toResponse(question, viewer))
                .toList();

        return new FaqQuestionsListResponse(page, visible.size());
    }

    public FaqQuestionResponse getLatest(AuthenticatedUser viewer) {
        return faqQuestionStore.findAll().stream()
                .filter(question -> question.getStatus() != FaqQuestionStatus.ARCHIVED)
                .max(Comparator.comparing(FaqQuestion::getCreatedAt))
                .map(question -> toResponse(question, viewer))
                .orElse(null);
    }

    public FaqQuestionsListResponse getPopular(int limit, AuthenticatedUser viewer) {
        return rankedList(limit, Comparator
                .comparingInt(FaqQuestion::getScore).reversed()
                .thenComparing(FaqQuestion::getCreatedAt, Comparator.reverseOrder()), viewer);
    }

    public FaqQuestionsListResponse getPinned(int limit, AuthenticatedUser viewer) {
        List<FaqQuestion> pinned = faqQuestionStore.findAll().stream()
                .filter(question -> question.getStatus() == FaqQuestionStatus.PINNED)
                .sorted(Comparator
                        .comparingInt(FaqQuestion::getScore).reversed()
                        .thenComparing(FaqQuestion::getCreatedAt, Comparator.reverseOrder()))
                .limit(Math.max(1, Math.min(limit, 100)))
                .toList();

        return new FaqQuestionsListResponse(
                pinned.stream().map(question -> toResponse(question, viewer)).toList(),
                pinned.size()
        );
    }

    public FaqQuestionResponse createQuestion(CreateFaqQuestionRequest request, AuthenticatedUser author) {
        Instant now = Instant.now();
        FaqQuestion question = new FaqQuestion(
                UUID.randomUUID().toString(),
                author.getId(),
                author.getUsername(),
                request.title().trim(),
                request.body().trim(),
                now,
                FaqQuestionStatus.ACTIVE,
                0,
                0,
                0,
                0,
                true
        );

        faqQuestionStore.save(question);
        return toResponse(question, author);
    }

    public FaqQuestionResponse vote(String questionId, FaqVoteRequest request, AuthenticatedUser voter) {
        FaqQuestion question = faqQuestionStore.findById(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question introuvable"));

        if (question.getStatus() == FaqQuestionStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Question archivée");
        }

        FaqVoteDirection direction = FaqVoteDirection.fromValue(request.direction());
        Map<String, Map<String, String>> votes = faqQuestionStore.getVotes();
        Map<String, String> questionVotes = votes.getOrDefault(questionId, Map.of());
        String previousVote = questionVotes.get(voter.getId());

        if (direction.name().equals(previousVote)) {
            faqQuestionStore.removeVote(questionId, voter.getId());
            applyVoteDelta(question, direction, -1);
        } else if (previousVote != null) {
            FaqVoteDirection previousDirection = FaqVoteDirection.fromValue(previousVote);
            faqQuestionStore.setVote(questionId, voter.getId(), direction.name());
            applyVoteDelta(question, previousDirection, -1);
            applyVoteDelta(question, direction, 1);
        } else {
            faqQuestionStore.setVote(questionId, voter.getId(), direction.name());
            applyVoteDelta(question, direction, 1);
        }

        maybeAutoPin(question);
        faqQuestionStore.save(question);

        return toResponse(
                faqQuestionStore.findById(questionId).orElse(question),
                voter
        );
    }

    public FaqQuestionResponse updateStatus(
            String questionId,
            UpdateFaqQuestionStatusRequest request,
            AuthenticatedUser actor
    ) {
        if (actor.getRole() != UserRole.ADMIN) {
            throw new AuthException(403, "Rôle administrateur requis");
        }

        FaqQuestion question = faqQuestionStore.findById(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question introuvable"));

        FaqQuestionStatus nextStatus = FaqQuestionStatus.valueOf(request.status().trim().toUpperCase(Locale.ROOT));
        question.setStatus(nextStatus);
        faqQuestionStore.save(question);

        return toResponse(question, actor);
    }

    private FaqQuestionsListResponse rankedList(
            int limit,
            Comparator<FaqQuestion> comparator,
            AuthenticatedUser viewer
    ) {
        List<FaqQuestion> ranked = faqQuestionStore.findAll().stream()
                .filter(question -> question.getStatus() != FaqQuestionStatus.ARCHIVED)
                .sorted(comparator)
                .limit(Math.max(1, Math.min(limit, 100)))
                .toList();

        return new FaqQuestionsListResponse(
                ranked.stream().map(question -> toResponse(question, viewer)).toList(),
                ranked.size()
        );
    }

    private void maybeAutoPin(FaqQuestion question) {
        if (question.getStatus() == FaqQuestionStatus.ACTIVE
                && question.getScore() >= AUTO_PIN_SCORE_THRESHOLD) {
            question.setStatus(FaqQuestionStatus.PINNED);
        }
    }

    private static void applyVoteDelta(FaqQuestion question, FaqVoteDirection direction, int delta) {
        if (direction == FaqVoteDirection.UP) {
            question.setUpvotes(Math.max(0, question.getUpvotes() + delta));
            question.setScore(question.getScore() + delta);
            return;
        }

        question.setDownvotes(Math.max(0, question.getDownvotes() + delta));
        question.setScore(question.getScore() - delta);
    }

    private boolean matchesStatusFilter(FaqQuestion question, String statusFilter) {
        if (statusFilter == null || statusFilter.isBlank() || "all".equalsIgnoreCase(statusFilter)) {
            return question.getStatus() != FaqQuestionStatus.ARCHIVED;
        }

        try {
            FaqQuestionStatus expected = FaqQuestionStatus.valueOf(statusFilter.trim().toUpperCase(Locale.ROOT));
            return question.getStatus() == expected;
        } catch (IllegalArgumentException exception) {
            return question.getStatus() != FaqQuestionStatus.ARCHIVED;
        }
    }

    private Comparator<FaqQuestion> resolveComparator(String sort) {
        if ("created".equalsIgnoreCase(sort)) {
            return Comparator.comparing(FaqQuestion::getCreatedAt).reversed();
        }
        if ("score".equalsIgnoreCase(sort)) {
            return Comparator
                    .comparingInt(FaqQuestion::getScore).reversed()
                    .thenComparing(FaqQuestion::getCreatedAt, Comparator.reverseOrder());
        }
        return Comparator
                .comparingInt((FaqQuestion question) -> question.getStatus() == FaqQuestionStatus.PINNED ? 1 : 0)
                .reversed()
                .thenComparingInt(FaqQuestion::getScore).reversed()
                .thenComparing(FaqQuestion::getCreatedAt, Comparator.reverseOrder());
    }

    private FaqQuestionResponse toResponse(FaqQuestion question, AuthenticatedUser viewer) {
        String userVote = null;
        if (viewer != null) {
            Map<String, String> questionVotes = faqQuestionStore.getVotes()
                    .getOrDefault(question.getId(), Map.of());
            userVote = questionVotes.get(viewer.getId());
        }

        return new FaqQuestionResponse(
                question.getId(),
                question.getAuthorId(),
                question.getAuthorName(),
                question.getTitle(),
                question.getBody(),
                question.getCreatedAt().toString(),
                question.getStatus().name(),
                question.getScore(),
                question.getUpvotes(),
                question.getDownvotes(),
                question.getAnswerCount(),
                question.isPendingStaffReview(),
                userVote
        );
    }

    private static FaqQuestion question(
            String id,
            String authorId,
            String authorName,
            String title,
            String body,
            Instant createdAt,
            FaqQuestionStatus status,
            int score,
            int upvotes,
            int downvotes,
            int answerCount,
            boolean pendingStaffReview
    ) {
        return new FaqQuestion(
                id,
                authorId,
                authorName,
                title,
                body,
                createdAt,
                status,
                score,
                upvotes,
                downvotes,
                answerCount,
                pendingStaffReview
        );
    }
}
