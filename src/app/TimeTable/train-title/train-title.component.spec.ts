import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainTitleComponent } from './train-title.component';

describe('TrainTitleComponent', () => {
  let component: TrainTitleComponent;
  let fixture: ComponentFixture<TrainTitleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TrainTitleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
