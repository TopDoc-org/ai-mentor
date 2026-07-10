import { Directive, Input, ElementRef, NgZone, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[counter]',
  standalone: true,
})
export class CounterDirective implements OnChanges {
  @Input({ required: true }) counter: number | null = 0;
  @Input() counterDuration: number = 800;

  private animId: number | null = null;

  constructor(private el: ElementRef, private zone: NgZone) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['counter'] !== undefined) {
      this.animate();
    }
  }

  private animate() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }

    const target = this.counter ?? 0;
    const start = performance.now();

    // Run the frame loop OUTSIDE Angular: zone.js patches requestAnimationFrame,
    // so leaving it in-zone fires a full-tree change detection every frame of
    // every counter. We write textContent directly, so no CD is needed here.
    this.zone.runOutsideAngular(() => {
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / this.counterDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        this.el.nativeElement.textContent = current;
        if (progress < 1) {
          this.animId = requestAnimationFrame(step);
        } else {
          this.el.nativeElement.textContent = target;
          this.animId = null;
        }
      };

      this.animId = requestAnimationFrame(step);
    });
  }
}
