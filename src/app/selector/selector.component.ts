import {Component, Input, OnInit} from '@angular/core';
import {DataSet} from '../OuDiaData/OudOperator';
import {ScrollService} from '../TimeTable/scroll.service';
import {SelectorService} from '../selector.service';
import {FileOpenService} from '../file-open.service';

@Component({
  selector: 'app-selector',
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.css']
})
export class SelectorComponent implements OnInit {
  @Input('oud') oudData: DataSet;

  constructor(private selectorService: SelectorService,private fileopenService:FileOpenService) { }

  ngOnInit() {
  }
  openFile(){
    document.getElementById("input").click();
  }
  openDownTimeTable(i:number){
    this.selectorService.onNotifySharedDataChanged(0,i,0);

  }
  openUpTimeTable(i:number){
    this.selectorService.onNotifySharedDataChanged(0,i,1);
  }
  file(event:any){
    const a=event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      this.fileopenService.onNotifySharedDataChanged((reader.result as string).split('\r\n'));
    }
    if(a.name.endsWith('oud')){
      console.log('oud');
      reader.readAsText(a,'Shift_JIS');

    }else if(a.name.endsWith('oud2')){
      console.log('oud2');
      reader.readAsText(a);

    }


  }


}
