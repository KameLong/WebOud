import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StationTimeComponent } from './station-time.component';

describe('StationTimeComponent', () => {
  let component: StationTimeComponent;
  let fixture: ComponentFixture<StationTimeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StationTimeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StationTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
