import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '../../core/services/auth.service';
import { ShowcaseChatService } from '../../core/services/showcase-chat.service';
import { ChatStylePreferencesService } from '../../core/services/chat-style-preferences.service';
import { ShowcaseChatComponent } from './showcase-chat';

describe('ShowcaseChatComponent (Phase V)', () => {
  let fixture: ComponentFixture<ShowcaseChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcaseChatComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ChatStylePreferencesService,
        {
          provide: ShowcaseChatService,
          useValue: {
            messages: signal([]).asReadonly(),
            connected: signal(true).asReadonly(),
            sendError: signal<string | null>(null).asReadonly(),
            connect: vi.fn(),
            disconnect: vi.fn(),
            sendMessage: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: vi.fn(() => true),
            promptLogin: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseChatComponent);
    fixture.componentRef.setInput('isExpanded', true);
    HTMLElement.prototype.scrollIntoView = function () {};
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and render chat composer', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-chat__composer')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Envoyer');
  });
});
