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
  stopList(): Array<number> {
    const s=this.oudData.stations.length;
    let result=new Array<number>();
    for(let  i =0;i<s;i++){
      result.push(i);
      if(s>this.train.stHandlings.length){
        this.train.stHandlings.push(new StHandling());
      }
    }
    return result;
  }

}
