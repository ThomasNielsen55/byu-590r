import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { EmbroideryComponent } from './embroidery.component';
import { EmbroideryService } from '../core/services/embroidery.service';
import { EmbroideryStore } from '../core/stores/embroidery.store';

describe('EmbroideryComponent', () => {
  let fixture: ComponentFixture<EmbroideryComponent>;
  let getEmbroideriesSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmbroideryComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        EmbroideryStore,
      ],
    }).compileComponents();

    const service = TestBed.inject(EmbroideryService);
    getEmbroideriesSpy = spyOn(service, 'getEmbroideries').and.returnValue(
      of({
        success: true,
        message: 'Embroideries',
        results: [
          {
            id: 1,
            name: 'Test hoop sampler',
            description: 'Dummy synopsis for the component test.',
            embroidery_picture: 'https://example.com/cover.jpg',
          },
          {
            id: 2,
            name: 'No-image row',
            description: 'Covers the placeholder branch when picture is null.',
            embroidery_picture: null,
          },
        ],
      })
    );
  });

  it('should create', () => {
    fixture = TestBed.createComponent(EmbroideryComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should load embroideries via the store and render bound rows (not hard-coded)', () => {
    fixture = TestBed.createComponent(EmbroideryComponent);
    fixture.detectChanges();

    expect(getEmbroideriesSpy).toHaveBeenCalled();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Test hoop sampler');
    expect(el.textContent).toContain('Dummy synopsis for the component test.');
    expect(el.textContent).toContain('No-image row');

    const imgs = el.querySelectorAll('img.embroidery-cover');
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute('src')).toBe('https://example.com/cover.jpg');

    // Verifies the "no image" branch renders a placeholder (not a hard-coded <img>).
    const placeholders = el.querySelectorAll('.cover-placeholder');
    expect(placeholders.length).toBe(1);
  });
});
