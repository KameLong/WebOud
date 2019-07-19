import {Component, Inject, Injector, Input, OnChanges, OnInit, ReflectiveInjector, SimpleChanges} from '@angular/core';
import {TabModel} from '../OuDiaData/tool';
import {TimeTableComponent} from '../TimeTable/time-table/time-table.component';
import {SelectorComponent} from '../selector/selector.component';
import {SampleAComponent} from '../sample-a/sample-a.component';
import {SampleBComponent} from '../sample-b/sample-b.component';
import {DataSet} from '../OuDiaData/OudOperator';

@Component({
  selector: 'app-tab-layout',
  templateUrl: './tab-layout.component.html',
  styleUrls: ['./tab-layout.component.css']
})
export class TabLayoutComponent implements OnInit,OnChanges {
  @Input('oud') oudData: DataSet;

  public currentTab: any;
  public currentTabModel: TabModel;
  public tabs: Array<TabModel>=new Array<TabModel>();
  private injector: Injector;
  constructor(injector: Injector){
    this.injector=injector;
  }
  ngOnInit() {
    if(this.oudData==null){
      this.oudData=new DataSet();
    }
  }
  ngOnChanges(sc: SimpleChanges) {
    for(let i=0;i<this.oudData.diagrams.length;i++){
      this.tabs.push(new TabModel(this.oudData.diagrams[i].name+'下り時刻表', TimeTableComponent, this.oudData,i,0));
      this.currentTabModel=this.tabs[0];
      this.tabs.push(new TabModel(this.oudData.diagrams[i].name+'上り時刻表', TimeTableComponent, this.oudData,i,1));
    }
    console.log(this.tabs);
  }
  public getCurrentContents(): any {
    for (let index = 0; index < this.tabs.length; index++) {
      const target = this.tabs[index];
      if (target.current) {
        this.currentTabModel=target;
        return target.compoment;
      }
    }
  }
  /**
   * 表示するコンテンツを切り替える
   *
   * @param {string} name クリックされたタブのタブ名
   * @returns {any} 切り替え先のコンテンツ( 実態はコンポーネント... これも抽象クラス作ってやると型指定できるけど今回はそこまでしない )
   * @memberof SwitchTabService
   */
  public changeCurrentContents(name: string): any {
    let component: any;

    // this._tabs は Array 型なので「for-in」は使わないで無難に「for文」で回す
    // 「for-of」でも良いけれど、それだとデバッグ時に「this」やら「_tabs」が何故か「undefined」になって気持ち悪い...
    for (let index = 0; index < this.tabs.length; index++) {
      const target = this.tabs[index];
      target.current = false;

      if (target.name === name) {
        target.current = true;
        component = target.compoment;
        this.currentTabModel=target;
      }
    }
    return component;
  }
  public onClick($event) {
    // クリックされたタブに応じて表示するコンテンツ( component ) を切り替える
    this.currentTab = this.changeCurrentContents($event.target.innerHTML);
  }
  public getInjector(): Injector{
    if(this.currentTab==null){
      return null;
    }
    return this.currentTabModel.getInjector(this.injector);
  }

}
