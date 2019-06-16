import {Component, Input, OnInit} from '@angular/core';
import {DataSet, Streak} from '../../OuDiaData/OudOperator';
import {ScrollService} from '../scroll.service';
import {Scroll} from '@angular/router';

@Component({
  selector: 'app-train-list',
  templateUrl: './train-list.component.html',
  styleUrls: ['./train-list.component.css']
})
export class TrainListComponent implements OnInit {
  @Input('oud') oudData: DataSet;
  constructor(private scrollService: ScrollService) { }

  ngOnInit() {
  }
  useTimeTable(): Array<Streak> {
    if(this.oudData.diagrams.length>0) {
      return this.oudData.diagrams[0].downStreaks;
    } else {
      return new Array<Streak>();
    }
  }
  onScroll(event: Event){
    let a=document.getElementById('trainList');
    this.scrollService.onNotifySharedDataChanged(a.scrollLeft,a.scrollTop);

  }


}
