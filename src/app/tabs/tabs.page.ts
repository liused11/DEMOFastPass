import { Component, ViewChild } from '@angular/core';
import { ModalController, IonTabs } from '@ionic/angular';
import { ParkingListComponent } from '../tab1/parking-list/parking-list.component';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  @ViewChild(IonTabs) tabs!: IonTabs;
  private modalHasOpenedOnce = false;

  constructor(private modalCtrl: ModalController) {}
//(ionTabsWillChange)="onTabChange($event)"
  // ionViewDidEnter() {
  //   // ✅ เปิด modal อัตโนมัติครั้งแรกเมื่อเข้าหน้า Tabs
  //   if (!this.modalHasOpenedOnce) {
  //     this.modalHasOpenedOnce = true;
  //     this.openParkingModal();
  //   }
  // }

  // async onTabChange(event: any) {
  //   const selectedTab = event.tab;
  //   if (selectedTab === 'tab1') {
  //     // ✅ ถ้า user กด tab1 → เปิด modal อีกครั้ง
  //     this.openParkingModal();
  //   }
  // }

  // async openParkingModal() {
  //   const modal = await this.modalCtrl.create({
  //     component: ParkingListComponent,
  //     // ❌ ไม่ต้องใช้ presentingElement เพราะเราต้องการ modal ครอบทั้งหน้า
  //     initialBreakpoint: 0.25,
  //     breakpoints: [0, 0.25, 0.5, 0.75, 1],
  //     backdropDismiss: false,
  //     handleBehavior: 'cycle',
  //     cssClass: 'google-map-sheet',
  //   });

  //   await modal.present();
  // }

}
