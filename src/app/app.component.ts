import { Component } from '@angular/core';
import {DataSet} from './OuDiaData/OudOperator';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  title = 'WebOud';
  oudiaData: DataSet=new DataSet();
  constructor(private http: HttpClient) {
    this.oudiaData=new DataSet();
    this.http.get('/assets/sample.oud', {
      responseType: 'blob',
    })
      .subscribe(
        data => {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.oudiaData.fromOud2((reader.result as string).split('\r\n'));
            this.startInit();
          }
          reader.readAsText(data,'Shift_JIS');

        },
        error => {
          console.log('通信に失敗しました。');
        }
      );
  }
  startInit(): string {
    console.log('読み込みました');

    return ' ';
  }


}
