import {Component, Input, OnInit} from '@angular/core';
import {DataSet, Streak} from '../../OuDiaData/OudOperator';

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
    return this.train.stHandlings.keys();
  }

}
