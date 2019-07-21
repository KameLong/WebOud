import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SampleBComponent } from './sample-b.component';

describe('SampleBComponent', () => {
  let component: SampleBComponent;
  let fixture: ComponentFixture<SampleBComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SampleBComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SampleBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
