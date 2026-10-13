/* Draws the small pixel-art icons next to each project. */
(function () {
  var C = { c: '#29F0FF', m: '#FF3D9A', w: '#FFFFFF', y: '#FFD84A', g: '#5DFF6E', o: '#FF8A3D', d: '#B0206A', b: '#3B5BFF' };
  var ART = {
    heart: [
      "................",
      "...mmm....mmm...",
      "..mmmmm..mmmmm..",
      "..mwwmmmmmmmmm..",
      "..mwmmmmmmmmmm..",
      "..mmmmmmmmmmmm..",
      "...mmmmmmmmmm...",
      "....mmmmmmmm....",
      ".....mmmmmm.....",
      "......mmmm......",
      ".......mm.......",
      "................"],
    stage: [
      "yyyyyyyyyyyyyyyy",
      "mdmdm......mdmdm",
      "mdmdm......mdmdm",
      "mdmd........dmdm",
      "mdmd........dmdm",
      "mdm..........mdm",
      "mdm....yy....mdm",
      "mdm..........mdm",
      "md............dm",
      "md............dm",
      "oooooooooooooooo",
      "oooooooooooooooo"],
    proto: [
      "................",
      ".ccccc....ccccc.",
      ".cwwwc..y.cwwwc.",
      ".cwwwcyyyycwwwc.",
      ".cwwwc..y.cwwwc.",
      ".cwwwc....cwwwc.",
      ".ccccc....ccccc.",
      "................",
      "........m.......",
      "........mm......",
      "........mmm.....",
      "........mm......"],
    scroll: [
      "................",
      "....yyyyyyyy....",
      ".....wwwwww.....",
      ".....wwmmww.....",
      ".....wmmmmw.....",
      ".....wmmmmw.....",
      ".....wwmmww.....",
      ".....wwwwww.....",
      ".....wcccww.....",
      ".....wwwwww.....",
      ".....wwcccw.....",
      "....yyyyyyyy...."],
    waves: [
      "..wwww....wwww..",
      ".wccccw..wccccw.",
      "wcc..ccwwcc..ccw",
      "c..bb..cc..bb..c",
      "..wwww....wwww..",
      ".wccccw..wccccw.",
      "wcc..ccwwcc..ccw",
      "c..bb..cc..bb..c",
      "..wwww....wwww..",
      ".wccccw..wccccw.",
      "wcc..ccwwcc..ccw",
      "c..bb..cc..bb..c"],
    plot: [
      "g...............",
      "g...............",
      "g...yy..........",
      "g..y..y.........",
      "g.y....y........",
      "g...............",
      "gyggggggyggggggy",
      "g...............",
      "g........y....y.",
      "g.........y..y..",
      "g..........yy...",
      "g..............."],
    portal: [
      "................",
      "....cccccccc....",
      "....cmmmmmmc....",
      "....cmwwwwmc....",
      "....cmwmmwmc....",
      "....cmwmmwmc....",
      "....cmwwwwmc....",
      "....cmmmmmmc....",
      "....cmmmmmmc....",
      "....cccccccc....",
      "..yy........yy..",
      "................"]
  };
  document.querySelectorAll('.plate[data-art]').forEach(function (el) {
    var rows = ART[el.getAttribute('data-art')];
    if (!rows) return;
    var s = '<svg viewBox="0 0 16 12" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < rows[y].length; x++) {
        var k = rows[y][x];
        if (C[k]) s += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + C[k] + '"/>';
      }
    }
    el.innerHTML = s + '</svg>';
  });
})();
