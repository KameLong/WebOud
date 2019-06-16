import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableMenuComponent } from './timetable-menu.component';

describe('TimetableMenuComponent', () => {
  let component: TimetableMenuComponent;
  let fixture: ComponentFixture<TimetableMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TimetableMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
