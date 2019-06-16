import {Component, Input, OnInit} from '@angular/core';
import {DataSet, StHandling, Streak} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-train',
  templateUrl: './train.component.html',
  styleUrls: ['./train.component.css']
})
export class TrainComponent implements OnInit {
  @Input('oud') oudData: DataSet;
  @Input('train')train: Streak;

  constructor() { }

  ngOnInit() {
  }
  trainColor(): string {
    return this.oudData.trainTypes[this.train.typeIdx].lineColor.RGB();
  }
  stopList(): IterableIterator<number> {
    const s=this.train.stHandlings.length;
    for(let  i =0;i<this.oudData.stations.length-s;i++){
      this.train.stHandlings.push(new StHandling());
    }
    return this.train.stHandlings.keys();
  }

}
