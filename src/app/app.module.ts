import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TimeTableComponent } from './TimeTable/time-table/time-table.component';
import { TimetableMenuComponent } from './TimeTable/timetable-menu/timetable-menu.component';
import { HttpClientModule } from '@angular/common/http';
import { TrainComponent } from './TimeTable/train/train.component';
import { StationComponent } from './TimeTable/station/station.component';
import { TrainNameComponent } from './TimeTable/train-name/train-name.component';
import { SelectorComponent } from './selector/selector.component';
import { ContainerComponent } from './container/container.component';
import { TabLayoutComponent } from './tab-layout/tab-layout.component';
import { SampleAComponent } from './sample-a/sample-a.component';
import { SampleBComponent } from './sample-b/sample-b.component';
import {DataSet} from './OuDiaData/OudOperator';
@NgModule({
  declarations: [
    AppComponent,
    TimeTableComponent,
    TimetableMenuComponent,
    TrainComponent,
    StationComponent,
    TrainNameComponent,
    SelectorComponent,
    ContainerComponent,
    TabLayoutComponent,
    SampleAComponent,
    SampleBComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,

  ],
  providers: [DataSet],
  bootstrap: [AppComponent,],
  entryComponents: [
    TimeTableComponent,
    SampleAComponent,
    SampleBComponent,

  ],
})
export class AppModule { }
