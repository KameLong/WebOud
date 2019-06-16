import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TimeTableComponent } from './TimeTable/time-table/time-table.component';
import { TimetableMenuComponent } from './TimeTable/timetable-menu/timetable-menu.component';
import { StationTitleComponent } from './TimeTable/station-title/station-title.component';
import { StationListComponent } from './TimeTable/station-list/station-list.component';
import { TrainTitleComponent } from './TimeTable/train-title/train-title.component';
import { TrainListComponent } from './TimeTable/train-list/train-list.component';
import { HttpClientModule } from '@angular/common/http';
import { TrainComponent } from './TimeTable/train/train.component';
import { StationTimeComponent } from './TimeTable/station-time/station-time.component';
import { StationComponent } from './TimeTable/station/station.component';
import { TrainNameComponent } from './TimeTable/train-name/train-name.component';
import { SelectorComponent } from './selector/selector.component';
import { ContainerComponent } from './container/container.component';
@NgModule({
  declarations: [
    AppComponent,
    TimeTableComponent,
    TimetableMenuComponent,
    StationTitleComponent,
    StationListComponent,
    TrainTitleComponent,
    TrainListComponent,
    TrainComponent,
    StationTimeComponent,
    StationComponent,
    TrainNameComponent,
    SelectorComponent,
    ContainerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
