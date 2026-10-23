/* Read-only design options using the existing Office, seats and walking grid. */
(function(){
  const specs={
    space:{title:'A｜像素太空艙',subtitle:'深藍金屬牆、青色燈帶、艙內地板',wall:{face:'#25415b',top:'#62cce1',base:'#192c42',base2:'#0e2035',edge:'#071525',inner:'#365976',innerLight:'#75cce4',innerDark:'#142f48'},floors:{kitchen:'nightTiles',office:'nightTiles',meeting:'studioCarpet',lounge:'darkTiles',archive:'nightTiles'},colors:['#0d2945','#163b56','#64d9ec'],dark:true},
    wood:{title:'B｜暖木工作室',subtitle:'奶油牆、木地板、綠色地毯、暖燈',wall:{face:'#c8bb99',top:'#f2e4bf',base:'#a9926e',base2:'#827455',edge:'#645c4c',inner:'#e7d9b7',innerLight:'#fff0ce',innerDark:'#9d9272'},floors:{kitchen:'tiles',office:'wood',meeting:'carpetLight',lounge:'wood',archive:'marble'},colors:['#d3b98a','#6e8d77','#efdfa9'],dark:false},
    neon:{title:'C｜霓虹夜景',subtitle:'紫藍牆、深色地板、粉紫燈、夜景窗',wall:{face:'#3d355a',top:'#b48ac8',base:'#28223f',base2:'#201c34',edge:'#130e25',inner:'#554773',innerLight:'#c1a0dc',innerDark:'#302244'},floors:{kitchen:'studioCarpet',office:'dreamwood',meeting:'studioCarpet',lounge:'nightTiles',archive:'nightTiles'},colors:['#261e43','#674474','#f299cc'],dark:true}
  };
  for(const [key,s] of Object.entries(specs))THEMES['preview-'+key]={wall:s.wall,floors:s.floors,rug:'round',dark:s.dark};
  function decorate(b,t,key){
    const s=specs[key],c=s.colors;
    // All features below are flat floor graphics or on the existing top wall.
    // Furniture footprints, doors, seats and room boundaries are untouched.
    b.fillStyle=c[0];b.fillRect(300,330,380,190);
    b.fillStyle=c[1];b.fillRect(308,338,364,174);
    b.strokeStyle=c[2];b.lineWidth=2;b.strokeRect(315,345,350,160);
    if(key==='space'){
      b.strokeStyle='#37758e';b.lineWidth=1;
      for(let x=322;x<665;x+=24){b.beginPath();b.moveTo(x,346);b.lineTo(x,504);b.stroke();}
      for(let y=350;y<505;y+=24){b.beginPath();b.moveTo(316,y);b.lineTo(664,y);b.stroke();}
      b.fillStyle='#285e88';b.beginPath();b.arc(490,420,52,0,Math.PI*2);b.fill();
      b.strokeStyle='#6de1ec';b.lineWidth=3;b.beginPath();b.ellipse(490,420,82,24,-.35,0,Math.PI*2);b.stroke();
      b.fillStyle='#75e0de';for(let x=16;x<950;x+=70)b.fillRect(x,48,34,3);
    }else if(key==='wood'){
      b.fillStyle='#b3c1a4';for(let x=330;x<650;x+=32)for(let y=360;y<492;y+=32)b.fillRect(x,y,11,11);
      b.fillStyle='#f4e7be';b.fillRect(416,391,148,50);b.fillStyle='#52705d';b.font='bold 15px Arial';b.textAlign='center';b.fillText('HANG FAI STUDIO',490,422);b.textAlign='left';
      for(let x=18;x<950;x+=78){b.fillStyle='#655746';b.fillRect(x,34,24,17);b.fillStyle='#e0c879';b.fillRect(x+2,36,20,13);}
    }else{
      b.strokeStyle='#b66fb9';for(let i=0;i<6;i++)b.strokeRect(333+i*12,356+i*8,304-i*24,138-i*16);
      b.fillStyle='#f19bcc';b.font='bold 24px Arial';b.textAlign='center';b.fillText('HANG FAI',490,425);b.textAlign='left';
      b.fillStyle='#e8a2ce';b.fillRect(15,49,930,3);b.fillStyle='#8e9ded';b.fillRect(15,54,930,2);
      // Pixel skyline stays inside the top wall's window band.
      for(let i=0;i<30;i++){const x=170+i*21,h=10+(i*13)%25;b.fillStyle=i%2?'#252c58':'#362b63';b.fillRect(x,45-h,15,h);b.fillStyle='#e0b6d4';b.fillRect(x+3,38-h,2,3);}
    }
  }
  function apply(o,key){
    if(!specs[key])return;o.setTheme('preview-'+key);
    o.decor=o.decor.filter(d=>!d.sceneOption);
    o.decor.unshift({sceneOption:true,y:-100,draw:(b,t)=>decorate(b,t,key)});
    o.decor.push({sceneOption:true,y:99999,draw:(b,t)=>{
      if(key==='wood')return;
      for(const x of [284,540]){
        b.fillStyle=key==='space'?'#081e37':'#201b3b';b.fillRect(x,4,104,44);
        if(key==='space'){
          b.fillStyle='#d5eeff';for(let i=0;i<12;i++)b.fillRect(x+5+(i*31)%94,7+(i*13)%35,1,1);
          b.fillStyle='#438fc5';b.beginPath();b.arc(x+65,30,21,0,Math.PI*2);b.fill();b.fillStyle='#8ac5b9';b.fillRect(x+53,20,15,5);b.fillRect(x+63,26,12,7);
        }else{
          for(let i=0;i<7;i++){const h=12+i*7%24;b.fillStyle=i%2?'#655577':'#42436b';b.fillRect(x+4+i*14,46-h,10,h);b.fillStyle='#efc9c0';for(let y=49-h;y<43;y+=7)b.fillRect(x+7+i*14,y,2,2);}
        }
        b.strokeStyle=specs[key].colors[2];b.lineWidth=2;b.strokeRect(x,4,104,44);b.beginPath();b.moveTo(x+52,4);b.lineTo(x+52,48);b.stroke();
      }
    }});
    o.zoomFactor=1;o.fit();
  }
  window.SceneOptions={specs,apply};
})();
