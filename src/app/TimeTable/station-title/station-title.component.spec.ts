import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StationTitleComponent } from './station-title.component';

describe('StationTitleComponent', () => {
  let component: StationTitleComponent;
  let fixture: ComponentFixture<StationTitleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StationTitleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StationTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
