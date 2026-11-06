// Dock changes resize the viewport, never refit the apartment or change pose.
export function resizeEditorViewport({renderer,camera,presentation,width,height,ratio}){
 renderer.setPixelRatio(ratio);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();presentation.resize(width,height);
}
